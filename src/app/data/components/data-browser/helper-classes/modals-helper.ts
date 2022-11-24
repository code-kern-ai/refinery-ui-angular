export type DataBrowserModals = {
    userInfo: UserInfoModal;
    filter: FilterModal;
    sliceInfo: SliceInfoModal;
    configuration: ConfigurationModal;
    findOutliers: FindOutliersModal;
    similaritySearch: SimilaritySearchModal;
    deleteSlice: DeleteSliceModal;
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

export type FindOutliersModal = {
    open: boolean;
    embeddingId: string;
};

export type SimilaritySearchModal = {
    open: boolean;
    recordId: string;
    embeddingId: string;
};

export type DeleteSliceModal = {
    open: boolean;
    id: string;
};

export function createDefaultDataBrowserModals(): DataBrowserModals {
    return {
        userInfo: {
            open: false,
            current: null
        },
        filter: {
            open: false,
            name: '',
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
        },
        findOutliers: {
            open: false,
            embeddingId: null
        },
        similaritySearch: {
            open: false,
            recordId: null,
            embeddingId: null
        },
        deleteSlice: {
            open: false,
            id: null
        }
    };
}