
import { getDescriptionForSliceType, Slice } from "src/app/data/components/data-browser/helper-classes/search-parameters";
import { LabelSource } from "../../enum/graphql-enums";
import { ExportComponent } from "./export.component";

export enum ExportEnums {
    ExportPreset = "ExportPreset",
    ExportRowType = "ExportRowType",
    ExportFileType = "ExportFileType",
    ExportFormat = "ExportFormat",
    LabelSource = "LabelSource",

    Heuristics = "Heuristics",
    Attributes = "Attributes",
    LabelingTasks = "LabelingTasks",
    DataSlices = "DataSlices"
}

export enum ExportPreset {
    DEFAULT = "DEFAULT",
    LABEL_STUDIO = "LABEL_STUDIO",
    CUSTOM = "CUSTOM"
}

export enum ExportRowType {
    ALL = "ALL",
    DATA_SLICE = "DATA_SLICE",
    SESSION = "SESSION"
}

export enum ExportFileType {
    JSON = "JSON",
    CSV = "CSV",
    XLSX = "XLSX"
}
export enum ExportFormat {
    DEFAULT = "DEFAULT",
    LABEL_STUDIO = "LABEL_STUDIO"
}

export function getExportTooltipFor(exportEnum: ExportEnums, element: any): string {
    switch (exportEnum) {
        case ExportEnums.ExportRowType:
            const key = (element.value ? element.value : element.name)
            switch (key) {
                case "ALL": return "Export all records in your project";
                case "SESSION": return "Export all records with your current data browser filter";
            }
            break;
        case ExportEnums.DataSlices:
            return getDescriptionForSliceType(element.sliceType);
    }

    return null;
}


/** Example Export dict
{
    "rows": {
        "type": "SLICE,SESSION or ALL",
        "id": "id-of-type, all would have no id"
    }, 
    "columns": {
        "labeling_tasks": ["ids of tasks"],
        "attributes": ["ids of attributes"],
        "sources": [
            {
                "type": "MANUAL, HEURISTIC, MODEL, WEAK_SUPERVISION",
                "id": "source-id, wahrscheinlich nur bei Heuristiken gefühlt"
            }
        ]
    },
    "file_type": "JSON, CSV, XLSX",
    "format": "CURRENT, LABELSTUDIO"
}
 */
export class ExportHelper {
    private baseComponent: ExportComponent;
    public error: string[] = [];
    constructor(baseComponent: ExportComponent) {
        this.baseComponent = baseComponent;
    }

    public buildExportData(): string {
        this.error = [];
        const exportData = {
            rows: this.buildExportDataRows(),
            columns: this.buildExportDataColumns(),
            file_type: this.firstActiveInGroup(ExportEnums.ExportFileType, 'value'),
            format: this.firstActiveInGroup(ExportEnums.ExportFormat, 'value'),
        };
        if (exportData.format == ExportFormat.LABEL_STUDIO && exportData.file_type != ExportFileType.JSON) {
            this.error.push("Label Studio export only supports JSON");
        }
        if (exportData.columns.labeling_tasks.length == 0 && exportData.columns.sources.length == 0 && exportData.columns.attributes.length == 0) {
            this.error.push("Nothing to export");
        }
        return JSON.stringify(exportData);
    }
    public getLabelStudioTemplateExportData(): [string[], string[]] {
        const tasks = this.allActive(ExportEnums.LabelingTasks);
        const attributes = this.allActive(ExportEnums.Attributes);
        if (tasks.length == 0) this.error.push("No tasks selected");
        if (attributes.length == 0) this.error.push("No attributes selected");
        return [tasks, attributes];
    }

    private buildExportDataRows(): any {
        let type = this.firstActiveInGroup(ExportEnums.ExportRowType, 'value');
        let id;
        if (type == ExportRowType.ALL) id = null;
        else if (type == ExportRowType.DATA_SLICE) {
            id = this.firstActiveInGroup(ExportEnums.DataSlices, "id");
        } else if (type == ExportRowType.SESSION) id = this.baseComponent.sessionId;
        return { type: type, id: id };
    }

    public firstActiveInGroup(group: ExportEnums, returnAttribute: string = null): string {
        const values = this.baseComponent.formGroups.get(group).getRawValue();
        for (let key in values) {
            if (values[key].active) {
                if (values[key].id == ExportComponent.NONE_IN_PROJECT) {
                    this.error.push("No active value found in group - " + group);
                    return null;
                }
                return returnAttribute ? values[key][returnAttribute] : key;
            }
        }
        this.error.push("No active value found in group - " + group);
        return null;
    }
    private allActive(group: ExportEnums, returnAttribute: string = "id"): any[] {
        const values = this.baseComponent.formGroups.get(group).getRawValue();
        let result = [];
        for (let key in values) {
            if (group == ExportEnums.LabelingTasks && values[key].id == ExportComponent.NONE_IN_PROJECT) continue;
            if (values[key].active) returnAttribute ? result.push(values[key][returnAttribute]) : result.push(values[key]);
        }
        return result;
    }
    //no return type to make use of the implicit typing
    private buildExportDataColumns() {
        return {
            labeling_tasks: this.allActive(ExportEnums.LabelingTasks),
            attributes: this.allActive(ExportEnums.Attributes),
            sources: this.buildExportDataSources()
        };
    }
    private buildExportDataSources(): any[] {
        const sources = [];
        const active = this.allActive(ExportEnums.LabelSource, "value");
        for (let source of active) {
            if (source == LabelSource.INFORMATION_SOURCE) {
                sources.push(...this.allActive(ExportEnums.Heuristics).map(v => ({ type: source, id: v })));
            }
            else sources.push({ type: source, id: null });
        }
        return sources;
    }
}