import { capitalizeFirst, enumToArray, getPythonFunctionName, isStringTrue } from "src/app/util/helper-functions"
import { BricksIntegratorComponent } from "../bricks-integrator.component"
import { BricksVariableComment, isCommentTrue } from "./comment-lookup";
import { BricksVariable, bricksVariableNeedsTaskId, BricksVariableType, getEmptyBricksVariable } from "./type-helper";
//currently included python types are: int, float, str, bool, list

export class BricksCodeParser {
    errors: string[] = [];
    variables: BricksVariable[] = [];
    globalComments: string[];
    baseCode: string;
    functionName: string;
    filterTypes: string[];

    constructor(private base: BricksIntegratorComponent) {
        this.filterTypes = enumToArray(BricksVariableType).filter(x => x != BricksVariableType.UNKNOWN && !x.startsWith("GENERIC"));
    }
    public prepareCode() {
        this.errors = [];
        this.baseCode = this.base.config.api.data.data.attributes.sourceCode;
        this.globalComments = this.collectGlobalComment();
        this.functionName = getPythonFunctionName(this.baseCode);
        const variableLines = this.collectVariableLines();
        if (variableLines.length == 0) {
            this.base.config.preparedCode = this.baseCode;
            this.base.config.codeFullyPrepared = true;
        }
        try {
            this.variables = this.parseVariableLines(variableLines);
            this.replaceVariables();
        } catch (error) {
            this.errors.push(error);
            console.log("couldn't parse code", error);
        }
    }

    public replaceVariables() {
        let replacedCode = this.baseCode;
        for (let i = 0; i < this.variables.length; i++) {
            const variable = this.variables[i];
            this.prepareReplaceLine(variable);
            replacedCode = replacedCode.replace(variable.line, variable.replacedLine);
        }
        this.base.config.preparedCode = replacedCode;
        this.extendCodeForRecordIde();
        this.base.config.codeFullyPrepared = this.variables.every(v => v.optional || (v.values.length > 0 && v.values.every(va => va != null)));
        this.base.config.canAccept = this.base.config.codeFullyPrepared;

    }

    private extendCodeForRecordIde() {
        if (!this.base.forIde) return;
        if (this.functionName == null || this.functionName == "@@unknown@@") return;
        const isExtractor = this.base.config.api.data.data.attributes.moduleType == "extractor";
        let printReturn = "\n\nprint(\"Record: \", record) \nprint(\"Result: \", ";
        if (isExtractor) {
            printReturn += "[v for v in " + this.functionName + "(record)])"
        } else {
            printReturn += this.functionName + "(record))"
        }
        this.base.config.preparedCode += printReturn;
    }

    private collectGlobalComment(): string[] {
        const lines = this.baseCode.split("\n");
        const commentLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("def ")) break;
            if (line.startsWith("#")) {
                const tmpLine = line.replace("#", "").trim();
                const idx = tmpLine.indexOf("[");
                if (idx > 0) {
                    const parts = tmpLine.split("[").map((x, i) => (i == 0 ? x : "[" + x).trim());
                    commentLines.push(...parts);
                }
                else commentLines.push(tmpLine);
            }
        }
        return commentLines.filter(x => x.trim() != "");
    }

    private prepareReplaceLine(variable: BricksVariable) {
        variable.replacedLine = variable.baseName;
        if (variable.pythonType) variable.replacedLine += ": " + variable.pythonType;
        variable.replacedLine += " = " + this.getValueString(variable);
        if (variable.comment) variable.replacedLine += " #" + variable.comment;

    }

    private getValueString(variable: BricksVariable): string {
        const realValues = variable.values.filter(v => v != null);
        if (realValues.length == 0) return "None";
        if (realValues.length == 1) {
            const v = this.getPythonVariable(realValues[0], variable.pythonType, variable.type);
            if (variable.canMultipleValues) return "[" + v + "]";
            return v;
        }
        return "[" + realValues.map(x => this.getPythonVariable(x, variable.pythonType, variable.type)).join(",") + "]";
    }

    private getPythonVariable(value: string, pythonType: string, bricksType: BricksVariableType) {
        if (value == null) return "None";
        if (bricksType == BricksVariableType.LOOKUP_LIST) return "knowledge." + value;
        if (bricksType == BricksVariableType.REGEX) return "r\"" + value + "\"";
        if (pythonType.includes("str")) return "\"" + value + "\"";
        return value;
    }

    private collectVariableLines(): string[] {

        const lines = this.baseCode.split("\n");
        const variableLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("def ")) break;
            if (line.startsWith("YOUR_")) variableLines.push(line);
        }
        return variableLines;
    }

    private parseVariableLines(variableLines: string[]): BricksVariable[] {
        const variables = [];
        for (let i = 0; i < variableLines.length; i++) {
            const line = variableLines[i];
            const variable = this.parseVariableLine(line);
            variables.push(variable);
        }
        return variables;
    }
    private parseVariableLine(line: string): BricksVariable {
        const variable = getEmptyBricksVariable();
        variable.line = line;
        variable.baseName = variable.line.split("=")[0].split(":")[0].trim();
        variable.displayName = capitalizeFirst(variable.baseName.substring(5));
        variable.pythonType = line.split(":")[1].split("=")[0].trim();
        variable.canMultipleValues = variable.pythonType.toLowerCase().includes("list");
        variable.type = this.getVariableType(variable);
        const comment = line.split("#");
        if (comment.length > 1) {
            comment.shift();
            variable.comment = comment.join("#");
        }
        variable.allowedValues = this.getAllowedValues(variable.type, variable.comment);
        variable.optional = isCommentTrue(variable.comment, BricksVariableComment.GLOBAL_OPTIONAL);
        variable.values = this.getValues(variable);
        this.setAddOptions(variable);
        return variable;
    }

    private getValues(variable: BricksVariable): any[] {
        //parse variable value
        if (variable.type.startsWith("GENERIC_") || variable.type == BricksVariableType.REGEX) {

            const value = variable.line.split("=")[1].split("#")[0].trim();
            if (value == "None") return [null];
            if (value == "[]") return [null];
            if (value.charAt(0) == "[") {
                return value.substring(1, value.length - 1).split(",").map(x => this.parseValue(x, variable.pythonType));
            } else {
                return [this.parseValue(value, variable.pythonType)];
            }
        } else return [null];
    }
    private parseValue(value: string, pythonType: string): any {
        if (value.startsWith("r\"")) value = value.substring(1); //remove r for regex
        value = value.replace(/"/g, "").trim();
        if (pythonType.includes("int")) return parseInt(value);
        if (pythonType.includes("float")) return parseFloat(value);
        if (pythonType.includes("bool")) return isStringTrue(value);
        return value;
    }

    private setAddOptions(variable: BricksVariable) {
        if (variable.type == BricksVariableType.GENERIC_BOOLEAN) {
            variable.options.colors = [null];
        }
    }

    private getVariableType(variable: BricksVariable): BricksVariableType {
        //first try find a specific type
        const types = this.filterTypes;
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            if (!this.base.labelingTaskId && bricksVariableNeedsTaskId(type as BricksVariableType)) continue;
            if (variable.baseName.includes(type)) return type as BricksVariableType;
        }
        //if no specific type is found, try to find a generic type
        if (variable.pythonType.includes("int")) return BricksVariableType.GENERIC_INT;
        else if (variable.pythonType.includes("float")) return BricksVariableType.GENERIC_FLOAT;
        else if (variable.pythonType.includes("str")) return BricksVariableType.GENERIC_STRING;
        else if (variable.pythonType.includes("bool")) return BricksVariableType.GENERIC_BOOLEAN;

        return BricksVariableType.UNKNOWN;

    }

    private getAllowedValues(forType: BricksVariableType, comment: string): any {
        switch (forType) {
            case BricksVariableType.LANGUAGE:
                const allLanguages = isCommentTrue(comment, BricksVariableComment.LANGUAGE_ALL);
                return this.base.dataRequestor.getIsoCodes(!allLanguages);
            case BricksVariableType.ATTRIBUTE:
                if (isCommentTrue(comment, BricksVariableComment.ATTRIBUTE_ONLY_TEXT)) return this.base.dataRequestor.getAttributes('TEXT');
                return this.base.dataRequestor.getAttributes(null);
            case BricksVariableType.LABELING_TASK:
                let typeFilter = null;
                if (isCommentTrue(comment, BricksVariableComment.LABELING_TASK_ONLY_CLASSIFICATION)) typeFilter = 'MULTICLASS_CLASSIFICATION';
                else if (isCommentTrue(comment, BricksVariableComment.LABELING_TASK_ONLY_EXTRACTION)) typeFilter = 'INFORMATION_EXTRACTION';
                return this.base.dataRequestor.getLabelingTasks(typeFilter);
            case BricksVariableType.LABEL:
                if (!this.base.labelingTaskId) {
                    console.log("no labeling task id given -> can't collect allowed labels");
                    return;
                }
                return this.base.dataRequestor.getLabels(this.base.labelingTaskId);
            case BricksVariableType.EMBEDDING:
                if (!this.base.labelingTaskId) {
                    return this.base.dataRequestor.getEmbeddings();
                }
                return this.base.dataRequestor.getEmbeddings(this.base.labelingTaskId);
            case BricksVariableType.LOOKUP_LIST:
                return this.base.dataRequestor.getLookupLists();
            default:
                return null;
        }
    }
}