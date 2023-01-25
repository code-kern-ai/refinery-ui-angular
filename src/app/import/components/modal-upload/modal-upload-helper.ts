import { UploadFileType } from "../helpers/upload-types";

export type UploadModals = {
    uploadFile: UploadFileModal;
};

export type UploadFileModal = {
    open: boolean;
};

export type UploadLookupListsModal = {
    open: boolean;
}

export function createDefaultModalUploadModal(): UploadModals {
    return {
        uploadFile: {
            open: false
        }
    };
}

export function getTitle(uploadFileType: UploadFileType): string {
    switch (uploadFileType) {
        case UploadFileType.RECORDS_NEW:
            return 'Upload New Records';
        case UploadFileType.RECORDS_ADD:
            return 'Upload Records to Existing Project';
        case UploadFileType.PROJECT:
            return 'Upload Project Data';
        case UploadFileType.KNOWLEDGE_BASE:
            return 'Upload List Data';
        default:
            return 'Upload File';
    }
}

export function getSubtitle(uploadFileType: UploadFileType): string {
    switch (uploadFileType) {
        case UploadFileType.RECORDS_NEW:
            return 'Upload data to create new records';
        case UploadFileType.RECORDS_ADD:
            return 'Upload data to add to an existing project';
        case UploadFileType.PROJECT:
            return 'Upload data from an existing project';
        case UploadFileType.KNOWLEDGE_BASE:
            return 'Upload data to your lookup list';
        default:
            return 'Upload a file';
    }
}