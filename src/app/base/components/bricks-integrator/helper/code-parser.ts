import { capitalizeFirst, enumToArray } from "src/app/util/helper-functions"
import { BricksIntegratorComponent } from "../bricks-integrator.component"
import { BricksVariableComment, isCommentTrue } from "./comment-lookup";
import { BricksVariable, BricksVariableType, getEmptyBricksVariable } from "./type-helper";
//currently included python types are: int, float, str, bool, list

export class BricksCodeParser {
    errors: string[] = [];
    variables: BricksVariable[] = [];
    baseCode: string;
    filterTypes: string[];

    constructor(private base: BricksIntegratorComponent) {
        this.filterTypes = enumToArray(BricksVariableType).filter(x => x != BricksVariableType.UNKNOWN && !x.startsWith("GENERIC"));
    }
    public prepareCode() {
        this.errors = [];
        this.baseCode = this.base.config.api.data.data.attributes.sourceCode;
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

        this.base.config.codeFullyPrepared = this.variables.every(v => v.values.length > 0 && v.values.every(va => va != null));
        this.base.config.canAccept = this.base.config.codeFullyPrepared;

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
        const code = this.base.config.api.data.data.attributes.sourceCode;

        const lines = code.split("\n");
        const variableLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("def ")) break;
            if (line.includes("YOUR_")) variableLines.push(line);
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
        variable.pythonType = line.split(":")[1].split("=")[0].trim().toLocaleLowerCase();
        variable.canMultipleValues = variable.pythonType.includes("list");
        variable.type = this.getVariableType(variable);
        const comment = line.split("#");
        if (comment.length > 1) {
            comment.shift();
            variable.comment = comment.join("#");
        }
        variable.allowedValues = this.getAllowedValues(variable.type, variable.comment);
        this.setAddOptions(variable);
        return variable;
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