
export type LabelingVars = {
    loading: boolean;
    loopAttributes: any[];
    taskLookup: {
        [attributeId: string]: {
            lookup: TaskLookup[];
            attribute: any;
        }; //this is typescript for all string keys -> so attributeId isn't "correct"
    }
}

type TaskLookup = {
    showText: boolean;
    showGridLabelPart: boolean;
    goldInfo?: {
        can: boolean,
        is: boolean,
    };
    girdRowSpan?: string;
    orderKey: number;
    task: any;
    tokenData?: any;
}

export type TokenLookup = {
    [attributeId: string]: {
        token: any[],
        [tokenIdx: number]: {
            rlaArray: {
                orderPos: number,// globalPosition used for absolute positioning
                bottomPos: string,
                isFirst: boolean,
                isLast: boolean,
                hoverGroups: any,
                labelId: string,
                canBeDeleted: boolean,
                rla: any,
            }[],
            tokenMarginBottom: string,
        }
    }
}
export type HotkeyLookup = {
    [hotkey: string]: {
        taskId: string,
        labelId: string
    }
}
export function getDefaultLabelingVars(): LabelingVars {
    return {
        loading: true,
        loopAttributes: null,
        taskLookup: null
    }
}
export const FULL_RECORD_ID = "FULL_RECORD";