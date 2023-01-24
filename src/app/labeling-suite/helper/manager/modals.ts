export type LabelingSuiteModals = {
    goldStar: {
        open: boolean;
        firstVisit: boolean
    };
    deleteRecord: { open: boolean };
    taskHeaderInfo: { open: boolean };
    settings: SettingsModal;
};

export type SettingsModal = {
    open: boolean;
};

export class LabelingSuiteModalManager {
    public modals: LabelingSuiteModals;

    constructor() {
        this.modals = this.createDefaultLabelingModals();
    }
    private createDefaultLabelingModals(): LabelingSuiteModals {
        return {
            goldStar: {
                open: false,
                firstVisit: true
            },
            deleteRecord: {
                open: false,
            },
            taskHeaderInfo: {
                open: false,
            },
            settings: {
                open: false,
            },
        };
    }
}