export type GatesIntegratorModal = {
    warningModal: WarningModal;
};

export type WarningModal = {
    open: boolean;
};

export function createDefaultGatesIntegratorModal(): GatesIntegratorModal {
    return {
        warningModal: {
            open: false,
        }
    };
}