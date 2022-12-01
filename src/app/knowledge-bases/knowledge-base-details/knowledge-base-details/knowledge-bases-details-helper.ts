export type LookupListsDetailsModals = {
    deleteLookupList: DeleteLookupListModal;
    uploadLookupList: UploadLookupListModal;
    pasteLookupList: PasteLookupListModal;
    removeLookupList: RemoveLookupListModal;
}

export type DeleteLookupListModal = {
    open: boolean;
};

export type UploadLookupListModal = {
    open: boolean;
};

export type PasteLookupListModal = {
    open: boolean;
    inputArea: string;
    inputSplit: string;
    remove: boolean;
};

export type RemoveLookupListModal = {
    open: boolean;
    inputArea: string;
    inputSplit: string;
    remove: boolean;
};

export function createDefaultLookupListDetailsModals(): LookupListsDetailsModals {
    return {
        deleteLookupList: {
            open: false
        },
        uploadLookupList: {
            open: false
        },
        pasteLookupList: {
            open: false,
            inputArea: '',
            inputSplit: '\\n',
            remove: false
        },
        removeLookupList: {
            open: false,
            inputArea: '',
            inputSplit: '\\n',
            remove: true
        }
    };
}