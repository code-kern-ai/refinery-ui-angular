export type ModelCallbacksModals = {
    deleteSelected: DeleteSelectedModal;
}

export type DeleteSelectedModal = {
    open: boolean;
    selectedInformationSources: any[];
    selectionList: string;
}

export function createDefaultModelCallbacksModals(): ModelCallbacksModals {
    return {
        deleteSelected: {
            open: false,
            selectedInformationSources: [],
            selectionList: ''
        }
    };
}