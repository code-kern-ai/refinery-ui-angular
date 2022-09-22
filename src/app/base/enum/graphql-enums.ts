export enum LabelSource {
    MANUAL = "MANUAL",
    WEAK_SUPERVISION = "WEAK_SUPERVISION",
    INFORMATION_SOURCE = "INFORMATION_SOURCE",
    MODEL_CALLBACK = "MODEL_CALLBACK",
}
export function labelSourceToString(source: LabelSource, forDisplay: boolean = true) {
    if (forDisplay) {
        switch (source) {
            case LabelSource.MANUAL: return "Manual";
            case LabelSource.WEAK_SUPERVISION: return "Weak Supervision";
            case LabelSource.MODEL_CALLBACK: return "Model Callback";
            case LabelSource.INFORMATION_SOURCE: return "Information Source";
            default: return source;
        }
    }
    return source;
}

export enum InformationSourceType {
    LABELING_FUNCTION = "LABELING_FUNCTION",
    ACTIVE_LEARNING = "ACTIVE_LEARNING",
    PRE_COMPUTED = "PRE_COMPUTED",
    ZERO_SHOT = "ZERO_SHOT",
    CROWD_LABELER = "CROWD_LABELER"
}

export function informationSourceTypeToString(source: InformationSourceType, short: boolean, forDisplay: boolean = true) {
    if (forDisplay) {
        switch (source) {
            case InformationSourceType.LABELING_FUNCTION: return short ? "LF" : "Labeling Function module";
            case InformationSourceType.ACTIVE_LEARNING: return short ? "AL" : "Active Learning module";
            case InformationSourceType.PRE_COMPUTED: return short ? "PC" : "Pre Computed module";
            case InformationSourceType.ZERO_SHOT: return short ? "ZS" : "Zero Shot module";
            case InformationSourceType.CROWD_LABELER: return short ? "CL" : "Crowd labeler";
            default: return source;
        }
    }
    return source;
}

export enum LabelingTask {
    //BINARY_CLASSIFICATION = "BINARY_CLASSIFICATION", // Currently diabled
    MULTICLASS_CLASSIFICATION = "MULTICLASS_CLASSIFICATION",
    INFORMATION_EXTRACTION = "INFORMATION_EXTRACTION",
    NOT_USEABLE = "NOT_USEABLE", //e.g. for annotators who can only use one task
    NOT_SET = "NOT_SET"
}

export function labelingTaskToString(source: LabelingTask, forDisplay: boolean = true) {
    if (forDisplay) {
        switch (source) {
            // case LabelingTask.BINARY_CLASSIFICATION: return "Binary Classification";
            case LabelingTask.MULTICLASS_CLASSIFICATION: return "Multiclass classification";
            case LabelingTask.INFORMATION_EXTRACTION: return "Information extraction";
            case LabelingTask.NOT_SET: return "Not Set";
            default: return source;
        }
    }
    return source;
}

export function getTaskTypeOrder(source: LabelingTask): number {
    switch (source) {
        case LabelingTask.MULTICLASS_CLASSIFICATION: return 3;
        case LabelingTask.INFORMATION_EXTRACTION: return 1;
        case LabelingTask.NOT_SET: return 2;
        default: return 4;
    }
}


export enum InformationSourceReturnType {
    RETURN = "RETURN",
    YIELD = "YIELD"
}
export enum RecordCategory {
    SCALE = "SCALE",
    TEST = "TEST"
}


export enum LabelingTaskTarget {
    ON_ATTRIBUTE = "ON_ATTRIBUTE",
    ON_WHOLE_RECORD = "ON_WHOLE_RECORD"
}
