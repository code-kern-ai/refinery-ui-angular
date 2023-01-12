import { UploadType } from "src/app/import/components/upload/upload-types";
import { UploadComponent } from "src/app/import/components/upload/upload.component";


export enum AssistantConstants {
    IGNORE_KEY = "IGNORE",
    IGNORE_VALUE = "Ignore annotations",
    UNKNOWN_KEY = "UNKNOWN",
    UNKNOWN_VALUE = "User not known"
}

export enum LabelStudioTaskMapping {
    FULL_RECORD_TASK = "FULL_RECORD_TASK",
    ATTRIBUTE_SPECIFIC = "ATTRIBUTE_SPECIFIC"
}

export enum AssistantStep {
    PREPARATION = "PREPARATION",
    MAPPINGS_USER = "MAPPINGS_USER",
    MAPPINGS_TASKS = "MAPPINGS_TASKS",
    RESTRICTIONS = "RESTRICTIONS",
}

export enum PreparationStep {
    INITIAL = "INITIAL",
    FILE_IN_PREPARATION = "FILE_IN_PREPARATION",
    FILE_PREPARED = "FILE_PREPARED",
    MAPPING_TRANSFERRED = "MAPPING_TRANSFERRED",
}

export type AssistantInputData = {
    uploadComponent: UploadComponent,
    uploadFunction: (type: UploadType) => boolean,
    uploadFunctionThisObject: Object
}

export type AssistantSetupData = {
    buttonCaption: string,
    modalHeader: string,
    isBeta?: boolean,
}
