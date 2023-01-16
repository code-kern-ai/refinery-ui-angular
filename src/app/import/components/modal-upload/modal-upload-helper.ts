export type UploadModals = {
    uploadProject: UploadProjectModal;
    uploadLookupLists: UploadLookupListsModal;
};

export type UploadProjectModal = {
    open: boolean;
    doingSomething: boolean;
};

export type UploadLookupListsModal = {
    open: boolean;
}

export function createDefaultModalUploadModal(): UploadModals {
    return {
        uploadProject: {
            open: false,
            doingSomething: false,
        },
        uploadLookupLists: {
            open: false,
        },
    };
}