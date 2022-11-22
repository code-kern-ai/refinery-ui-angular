export type SideBarPmModals = {
    versionOverview: VersionOverviewModal;
    steps: StepsModal;
};

export type VersionOverviewModal = {
    open: boolean;
    data: any[];
};

export type StepsModal = {
    open: boolean;
    openTab: number;
};

export function createDefaultSideBarPmModals(): SideBarPmModals {
    return {
        versionOverview: {
            open: false,
            data: [],
        },
        steps: {
            open: false,
            openTab: 0,
        },
    };
}