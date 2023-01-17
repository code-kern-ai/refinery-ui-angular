export type UploadModals = {
    uploadFile: UploadFileModal;
};

export type UploadFileModal = {
    open: boolean;
    doingSomething: boolean;
};

export type UploadLookupListsModal = {
    open: boolean;
}

export function createDefaultModalUploadModal(): UploadModals {
    return {
        uploadFile: {
            open: false,
            doingSomething: false
        }
    };
}