export type ZeroShotModals = {
    whySoLong: WhySoLongModal;
    cancelZeroShot: CancelZeroShotModal;
    deleteZeroShot: DeleteZeroShotModal;
    runOn10Details: RunOn10DetailsModal;
};

export type WhySoLongModal = {
    open: boolean;
};

export type CancelZeroShotModal = {
    open: boolean;
};

export type DeleteZeroShotModal = {
    open: boolean;
    zeroShotId: string;
};

export type RunOn10DetailsModal = {
    open: boolean;
    record: any;
};

export function createDefaultZeroShotModals(): ZeroShotModals {
    return {
        whySoLong: {
            open: false
        },
        cancelZeroShot: {
            open: false
        },
        deleteZeroShot: {
            open: false,
            zeroShotId: ''
        },
        runOn10Details: {
            open: false,
            record: null
        }
    }
}