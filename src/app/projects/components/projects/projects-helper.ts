export type ProjectsModals = {
    uploadProject: UploadProjectModal;
};

export type UploadProjectModal = {
    open: boolean;
    doingSomething: boolean;
};

export function createDefaultProjectsModals(): ProjectsModals {
    return {
        uploadProject: {
            open: false,
            doingSomething: false,
        },
    };
}