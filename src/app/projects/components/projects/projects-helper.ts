export type ProjectsModals = {
    uploadProject: UploadProjectModal;
};

export type UploadProjectModal = {
    open: boolean;
};

export function createDefaultProjectsModals(): ProjectsModals {
    return {
        uploadProject: {
            open: false,
        },
    };
}