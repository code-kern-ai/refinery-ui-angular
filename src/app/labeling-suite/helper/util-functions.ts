import { informationSourceTypeToString, LabelSource, labelSourceToString } from "src/app/base/enum/graphql-enums";

export function getHoverGroups(data: any): any {
    const all: any = {
        task: "TA_" + data.labelingTaskLabel.labelingTask.name, //names are unique
        type: "TY_" + (data.sourceType == LabelSource.INFORMATION_SOURCE ? informationSourceTypeToString(data.informationSource.type, false) : labelSourceToString(data.sourceType)),
        label: "LA_" + data.labelingTaskLabel.id,
        createdBy: "CR_" + (data.sourceType == LabelSource.INFORMATION_SOURCE ? data.informationSource.name : data.user.id),
        rlaId: "ID_" + data.id,
    }
    // if (data.value) all.value = "VA_" + data.value;
    return {
        type: getHoverGroupFor(HoverGroupTarget.TYPE, all),
        task: getHoverGroupFor(HoverGroupTarget.TASK, all),
        label: getHoverGroupFor(HoverGroupTarget.LABEL, all),
        createdBy: getHoverGroupFor(HoverGroupTarget.CREATED_BY, all),
        rlaId: getHoverGroupFor(HoverGroupTarget.RLA_ID, all),
    }
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