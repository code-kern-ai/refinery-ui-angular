export type DataBrowserModals = {
    userInfo: UserInfoModal;
};

export type UserInfoModal = {
    open: boolean;
    current: any;
};

export function createDefaultDataBrowserModals(): DataBrowserModals {
    return {
        userInfo: {
            open: false,
            current: null
        },
    };
}