
export type LabelingVars = {
    loading: boolean;
    loopAttributes: any[];
    taskLookup: {
        [attributeId: string]: {
            lookup: TaskLookup[];
            attribute: any;
        }; //this is typescript for all string keys -> so attributeId isn't correct
    }
}

type TaskLookup = {
    showText: boolean;
    showGridLabelPart: boolean;
    girdRowSpan?: string;
    orderKey: number;
    task: any;
    tokenData?: any;
}

export function getDefaultLabelingVars(): LabelingVars {
    return {
        loading: true,
        loopAttributes: null,
        taskLookup: null
    }
}
export const FULL_RECORD_ID = "FULL_RECORD";