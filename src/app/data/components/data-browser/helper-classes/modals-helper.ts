export type DataBrowserModals = {
    userInfo: UserInfoModal;
    filter: FilterModal;
    sliceInfo: SliceInfoModal;
    configuration: ConfigurationModal;
};

export type UserInfoModal = {
    open: boolean;
    current: any;
};

export type FilterModal = {
    open: boolean;
    name: string;
    sliceNameExists: boolean;
    displayStaticNotAllowedWarning: boolean;
};

export type SliceInfoModal = {
    open: boolean;
    data: any;
};

export type ConfigurationModal = {
    open: boolean;
    highlightText: boolean;
    weakSupervisionRelated: boolean;
    separator: string;
};

export function createDefaultDataBrowserModals(): DataBrowserModals {
    return {
        userInfo: {
            open: false,
            current: null
        },
        filter: {
            open: false,
            name: null,
            sliceNameExists: false,
            displayStaticNotAllowedWarning: false
        },
        sliceInfo: {
            open: false,
            data: null
        },
        configuration: {
            open: false,
            highlightText: true,
            weakSupervisionRelated: false,
            separator: ','
        }
    };
}