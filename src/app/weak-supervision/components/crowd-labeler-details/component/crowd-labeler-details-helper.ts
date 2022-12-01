export type CrowdLabelersModals = {
    deleteCrowdLabeler: DeleteCrowdLabelerModal;
};

export type DeleteCrowdLabelerModal = {
    open: boolean;
};

export function createDefaultCrowdLabelersModals(): CrowdLabelersModals {
    return {
        deleteCrowdLabeler: {
            open: false,
        },
    };
}