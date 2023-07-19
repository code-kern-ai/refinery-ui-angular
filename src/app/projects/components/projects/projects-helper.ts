export type ProjectsModals = {
    uploadProject: UploadProjectModal;
    sampleProjectName: SampleProjectNameModal;
};

export type UploadProjectModal = {
    open: boolean;
    doingSomething: boolean;
};

export type SampleProjectNameModal = {
    open: boolean;
    projectNameExists: boolean;
}

export function createDefaultProjectsModals(): ProjectsModals {
    return {
        uploadProject: {
            open: false,
            doingSomething: false,
        },
        sampleProjectName: {
            open: false,
            projectNameExists: false
        },
    };
}