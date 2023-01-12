export enum UploadType {
    DEFAULT = "DEFAULT",
    LABEL_STUDIO = "LABEL_STUDIO"
}

export enum UploadFileType {
    RECORDS_NEW = "records",
    RECORDS_ADD = "records",
    KNOWLEDGE_BASE = "knowledge_base",
    PROJECT = "project"
}

export type UploadOptions = {
    /**
 * Option set for the upload component
 * @deleteProjectOnFail {boolean, optional} - If true, the project will be deleted if the upload fails
 * @reloadOnFinish {boolean, optional} - If true, the page will reload after the upload is finished
 */
    deleteProjectOnFail: boolean;
    reloadOnFinish: boolean;

};