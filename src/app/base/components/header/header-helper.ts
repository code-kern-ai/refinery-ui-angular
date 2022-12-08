export type HeaderModals = {
    notifications: NotificationsModal;
};

export type NotificationsModal = {
    open: boolean;
};


export function createDefaultHeaderModals(): HeaderModals {
    return {
        notifications: {
            open: false,
        }
    };
}