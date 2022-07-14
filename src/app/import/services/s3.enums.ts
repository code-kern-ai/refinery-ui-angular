export enum UploadStates {
    PENDING = "PENDING",
    WAITING = "WAITING",
    IN_PROGRESS = "IN_PROGRESS",
    DONE = "DONE",
    ERROR = "ERROR",
}

export enum DownloadState {
    NONE,
    PREPARATION,
    DOWNLOAD,
    COMPLETED,
    ERROR,
}
