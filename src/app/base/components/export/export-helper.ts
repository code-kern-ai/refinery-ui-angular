
import { LabelSource } from "../../enum/graphql-enums";
import { ExportComponent } from "./export.component";

export enum ExportEnums {
    ExportPreset = "ExportPreset",
    ExportRowType = "ExportRowType",
    ExportFileType = "ExportFileType",
    ExportFormat = "ExportFormat",
    LabelSource = "LabelSource",

    Heuristics = "Heuristics",
    Attributes = "Attriubtes",
    LabelingTasks = "LabelingTasks",
    DataSlices = "DataSlices"
}

export enum ExportPreset {
    CURRENT = "CURRENT",
    LABELSTUDIO = "LABELSTUDIO",
    CUSTOM = "CUSTOM"
}

export enum ExportRowType {
    ALL = "ALL",
    SLICE = "SLICE",
    SESSION = "SESSION"
}

export enum ExportFileType {
    JSON = "JSON",
    CSV = "CSV",
    XLSX = "XLSX"
}
export enum ExportFormat {
    CURRENT = "CURRENT",
    LABELSTUDIO = "LABELSTUDIO"
}


/** Example Export dict
{
    "rows": {
        "type": "STATIC,DYNAMIC,SESSION or ALL",
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
    constructor(baseComponent: ExportComponent) {
        this.baseComponent = baseComponent;
    }

    public buildExportData(): string {
        const exportData = {
            rows: this.buildExportDataRows(),
            columns: this.buildExportDataColumns(),
            file_type: this.firstActiveInGroup(ExportEnums.ExportFileType, 'value'),
            format: this.firstActiveInGroup(ExportEnums.ExportFormat, 'value'),
        };
        console.log(exportData);
        return JSON.stringify(exportData);
    }
    private buildExportDataRows(): any {
        let type = this.firstActiveInGroup(ExportEnums.ExportRowType, 'value');
        let id;
        if (type == ExportRowType.ALL) id = null;
        else if (type == ExportRowType.SLICE) {
            id = this.firstActiveInGroup(ExportEnums.DataSlices, "id");
            type = this.baseComponent.enumArrays.get(ExportEnums.DataSlices).find(v => v.id == id).sliceType;
        } else if (type == ExportRowType.SESSION) id = this.baseComponent.sessionId;
        return { type: type, id: id };
    }

    private firstActiveInGroup(group: ExportEnums, returnAttribute: string = null): string {
        const values = this.baseComponent.formGroups.get(group).getRawValue();
        for (let key in values) {
            if (values[key].active) return returnAttribute ? values[key][returnAttribute] : key;
        }
        console.log("no active value found in group - shouldn't happen", group)
        return null;
    }
    private allActive(group: ExportEnums, returnAttribute: string = "id"): any[] {
        const values = this.baseComponent.formGroups.get(group).getRawValue();
        let result = [];
        for (let key in values) {
            if (values[key].active) returnAttribute ? result.push(values[key][returnAttribute]) : result.push(values[key]);
        }
        return result;
    }
    private buildExportDataColumns(): any {
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