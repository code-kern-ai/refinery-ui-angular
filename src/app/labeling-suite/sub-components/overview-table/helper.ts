import { LabelColors } from "src/app/projects/components/project-settings/helper/label-helper";

export type HeuristicInfo = {
    show: boolean;
    has: boolean;
}

export function getEmptyHeuristicInfo(): HeuristicInfo {
    return {
        show: false,
        has: false
    }
}

export type TableDisplayData = {
    hoverGroups: {
        type: string,
        task: string,
        label: string,
        createdBy: string,
        value: string,
    },
    orderPos: number,
    sourceType: string,
    taskName: string,
    createdBy: string,
    label: {
        name: string,
        value: string,
        backgroundColor: string,
        textColor: string,
        borderColor: string,
    }
}
