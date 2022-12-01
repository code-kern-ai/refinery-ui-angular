export type LookuplistsModals = {
    deleteSelected: DeleteSelectedLookupListsModal;
};

export type DeleteSelectedLookupListsModal = {
    open: boolean;
    selectedLookupLists: any[];
    selectionList: string;
};

export function createDefaultLookuplistsModals(): LookuplistsModals {
    return {
        deleteSelected: {
            open: false,
            selectedLookupLists: [],
            selectionList: ""
        }
    };
}