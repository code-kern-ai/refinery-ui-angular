import { FormGroup } from "@angular/forms";
import { DownloadState } from "src/app/import/services/s3.enums";

export type SettingModals = {
    attribute: AttributeModal;
    embedding: {
        create: CreateEmbeddingModal;
        delete: DeleteEmbeddingModal;
    };
    projectExport: ProjectExportModal;
    label: {
        create: CreateLabelModal;
        delete: DeleteLabelModal;
    },
    labelingTask: {
        create: CreateLabelingTaskModal;
        delete: DeleteLabelingTaskModal;
    }
};

export type AttributeModal = {
    open: boolean;
    name: string;
    type: string;
    duplicateNameExists: boolean;
};

export type CreateEmbeddingModal = {
    open: boolean;
    blocked: boolean;
    embeddingCreationFormGroup: FormGroup;
    currentEmbeddingHandle: any;
};

export type DeleteEmbeddingModal = {
    open: boolean;
    id: string;
};

export type ProjectExportModal = {
    open: boolean;
    projectSize: number;
    downloadSizeText: string;
    projectExportCredentials: {
        objectName: string;
        downloadFileName: string;
    }
    projectExportSchema: FormGroup;
    downloadPrepareMessage: DownloadState;
};

export type CreateLabelModal = {
    open: boolean;
    taskId: string;
    labelName: HTMLInputElement;
};

export type DeleteLabelModal = {
    open: boolean;
    label: any;
    taskId: string;
};

export type CreateLabelingTaskModal = {
    open: boolean;
    name: string;
    taskId: string;
};

export type DeleteLabelingTaskModal = {
    open: boolean;
    taskId: string;
};

export function createDefaultSettingModals(): SettingModals {
    return {
        attribute: {
            open: false,
            name: null,
            type: "Text",
            duplicateNameExists: false
        },
        embedding: {
            create: {
                open: false,
                blocked: false,
                embeddingCreationFormGroup: null,
                currentEmbeddingHandle: null
            },
            delete: {
                open: false,
                id: null
            }
        },
        projectExport: {
            open: false,
            projectSize: null,
            downloadSizeText: null,
            projectExportCredentials: {
                objectName: null,
                downloadFileName: null
            },
            projectExportSchema: null,
            downloadPrepareMessage: null
        },
        label: {
            create: {
                open: false,
                taskId: null,
                labelName: null
            },
            delete: {
                open: false,
                label: null,
                taskId: null
            }
        },
        labelingTask: {
            create: {
                open: false,
                name: null,
                taskId: null
            },
            delete: {
                open: false,
                taskId: null
            }
        }
    };
};