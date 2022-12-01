import { FormGroup } from "@angular/forms";

export type ModelDownloadModals = {
    addNewModel: AddNewModelModal;
    deleteModel: DeleteModelModal;
};

export type AddNewModelModal = {
    open: boolean;
    form: FormGroup;
    indexSeparator: number;
};

export type DeleteModelModal = {
    open: boolean;
    name: string;
    currentModelHandle: any;
};

export function createDefaultModelDownloadModals(): ModelDownloadModals {
    return {
        addNewModel: {
            open: false,
            form: null,
            indexSeparator: null
        },
        deleteModel: {
            open: false,
            name: '',
            currentModelHandle: null
        }
    };
}