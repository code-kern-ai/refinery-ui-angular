import { Project } from "src/app/base/entities/project";

export enum UploadType {
    DEFAULT = "DEFAULT",
    LABEL_STUDIO = "LABEL_STUDIO"
}

export enum UploadFileType {
    RECORDS = "records",
    KNOWLEDGE_BASE = "knowledge_base",
    PROJECT = "project",
    RECORDS_NEW = "records_new",
    RECORDS_ADD = "records_add"
}

export type UploadOptions = {
    /**
 * Option set for the upload component
 * @deleteProjectOnFail {boolean, optional} - If true, the project will be deleted if the upload fails
 * @reloadOnFinish {boolean, optional} - If true, the page will reload after the upload is finished
 * @tokenizerValues {string[], optional} - If set, the tokenizer dropdown will be shown and the values will be used as options
 * @knowledgeBaseId {string, optional} - Knowledge base id used for the upload terms
 * @projectNameList {Project[], optional} - List of all projects
 */
    deleteProjectOnFail?: boolean;
    reloadOnFinish?: boolean;
    tokenizerValues?: string[];
    knowledgeBaseId?: string;
    projectNameList?: Project[]
};

export type UploadTask = {
    fileAdditionalInfo: string;
    id: string;
    progress: number;
    state: string;
    userId: string;
};