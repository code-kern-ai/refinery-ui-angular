import { UploadType } from "src/app/import/components/upload/upload-helper";
import { UploadComponent } from "src/app/import/components/upload/upload.component";


export enum AssistantPreset {
    LABEL_STUDIO = "LABEL_STUDIO"
}
export enum AssistantStep {
    PREPARATION = "PREPARATION",
    SETTINGS = "SETTINGS",
    RESTRICTIONS = "RESTRICTIONS",
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

export function getBaseSetupDataForPreset(preset: AssistantPreset): AssistantSetupData {
    switch (preset) {
        case AssistantPreset.LABEL_STUDIO:
            return { buttonCaption: 'Try our Label Studio import', modalHeader: 'Label Studio import', isBeta: true };
    }

    return { buttonCaption: "Unknown Assistant Preset", modalHeader: "Unknown Assistant Preset" };
}