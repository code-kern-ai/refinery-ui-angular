export type LabelingSuiteModals = {
    goldStar: { open: boolean };
    deleteRecord: { open: boolean };
    settings: SettingsModal;
};


export type SettingsModal = {
    open: boolean;
};

export function createDefaultLabelingModals(): LabelingSuiteModals {
    return {
        goldStar: { open: false },
        deleteRecord: {
            open: false,
        },
        settings: {
            open: false,
        },
    };
}