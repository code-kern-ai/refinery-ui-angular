import { informationSourceTypeToString, LabelSource, labelSourceToString } from "src/app/base/enum/graphql-enums";

export function getHoverGroupsOverviewTable(data: any): any {
    const all: any = {
        task: "TA_" + data.labelingTaskLabel.labelingTask.name, //names are unique
        type: "TY_" + (data.sourceType == LabelSource.INFORMATION_SOURCE ? informationSourceTypeToString(data.informationSource.type, false) : labelSourceToString(data.sourceType)),
        label: "LA_" + data.labelingTaskLabel.id,
        createdBy: "CR_" + (data.sourceType == LabelSource.INFORMATION_SOURCE ? data.informationSource.name : data.user.id),
        rlaId: "ID_" + data.id,
    }
    return {
        type: getHoverGroupFor(HoverGroupTarget.TYPE, all),
        task: getHoverGroupFor(HoverGroupTarget.TASK, all),
        label: getHoverGroupFor(HoverGroupTarget.LABEL, all),
        labelClass: getHoverClassLabel(data.sourceType),
        createdBy: getHoverGroupFor(HoverGroupTarget.CREATED_BY, all),
        rlaId: getHoverGroupFor(HoverGroupTarget.RLA_ID, all),
    }
}

export function getHoverClassLabel(type: LabelSource): string {
    switch (type) {
        case LabelSource.MANUAL:
            return "label-overlay-manual";
        case LabelSource.INFORMATION_SOURCE:
            return "label-overlay-heuristic";
        case LabelSource.WEAK_SUPERVISION:
            return "label-overlay-weak-supervision";
        case LabelSource.MODEL_CALLBACK:
            return "label-overlay-model";
        default:
            return "";
    }
}

export function getHoverGroupsTaskOverview(taskName: string, labelId?: string): any {
    const all: any = {
        task: "TA_" + taskName, //names are unique
    }
    if (labelId) {
        all.label = "LA_" + labelId;
        return getHoverGroupFor(HoverGroupTarget.LABEL, all);
    }
    return getHoverGroupFor(HoverGroupTarget.TASK, all);
}



export function getHoverGroupFor(first: HoverGroupTarget, all: any): string {
    let finalString = all[first];
    for (let key in all) {
        if (key == first) continue;
        finalString += "," + all[key];
    }
    return finalString;
}


export enum HoverGroupTarget {
    TYPE = 'type',
    TASK = 'task',
    LABEL = 'label',
    CREATED_BY = 'createdBy',
    RLA_ID = 'rlaId',
}