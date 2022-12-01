export type LabelingModals = {
    goldStar: GoldStartModal;
    deleteRecord: DeleteRecordModal;
};

export type GoldStartModal = {
    open: boolean;
};

export type DeleteRecordModal = {
    open: boolean;
};

export function createDefaultLabelingModals(): LabelingModals {
    return {
        goldStar: {
            open: false,
        },
        deleteRecord: {
            open: false,
        },
    };
}