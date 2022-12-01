export type AttributeCalculationModals = {
    executeAttribute: ExecuteAttributeModal;
    attributeDetails: AttributeDetailsModal;
    deleteUserAttribute: DeleteUserAttributeModal;
};

export type ExecuteAttributeModal = {
    open: boolean;
    canRunProject: boolean;
};

export type AttributeDetailsModal = {
    open: boolean;
    recordData: any;
    currentRecordIdx: number;
};

export type DeleteUserAttributeModal = {
    open: boolean;
};

export function createDefaultAttributeCalculationModals(): AttributeCalculationModals {
    return {
        executeAttribute: {
            open: false,
            canRunProject: false,
        },
        attributeDetails: {
            open: false,
            recordData: null,
            currentRecordIdx: -1
        },
        deleteUserAttribute: {
            open: false,
        }
    };
}

