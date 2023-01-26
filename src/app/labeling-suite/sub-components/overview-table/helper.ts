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
        rlaId: string,
    },
    orderPos: number,
    orderPosSec: number,
    sourceType: string,
    sourceTypeKey: string,
    taskName: string,
    createdBy: string,
    label: {
        name: string,
        value: string,
        backgroundColor: string,
        textColor: string,
        borderColor: string,
    },
    rla: any
}

export type HeaderHover = {
    class: string,
    typeCollection: string,
    taskCollection: string,
    labelCollection: string,
    createdByCollection: string,
    rlaCollection: string,
}

export function getEmptyHeaderHover() {
    //holds dummy group as first element to not use a main group
    return {
        class: 'border-l border-r bg-gray-200 font-bold',
        typeCollection: 'TYPE,',
        taskCollection: 'TASK,',
        labelCollection: 'LABEL,',
        createdByCollection: 'CR,',
        rlaCollection: 'RLA,',
    }
}