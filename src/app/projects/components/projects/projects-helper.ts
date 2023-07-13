export type ProjectsModals = {
    uploadProject: UploadProjectModal;
    projectNameSampleProject: ProjectNameSampleProjectModal;
};

export type UploadProjectModal = {
    open: boolean;
    doingSomething: boolean;
};

export type ProjectNameSampleProjectModal = {
    open: boolean;
    projectNameExists: boolean;
}

export function createDefaultProjectsModals(): ProjectsModals {
    return {
        uploadProject: {
            open: false,
            doingSomething: false,
        },
        projectNameSampleProject: {
            open: false,
            projectNameExists: false
        },
    };
}