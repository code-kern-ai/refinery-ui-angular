export type DataBrowserModals = {
    userInfo: UserInfoModal;
    filter: FilterModal;
    sliceInfo: SliceInfoModal;
    configuration: ConfigurationModal;
    findOutliers: FindOutliersModal;
    similaritySearch: SimilaritySearchModal;
    deleteSlice: DeleteSliceModal;
    recordComments: RecordCommentsModal;
    displaySql: DisplaySqlModal;
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
    lineBreaks: LineBreaksType;
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

export type RecordCommentsModal = {
    open: boolean;
    commentsData: any;
};

export type DisplaySqlModal = {
    open: boolean;
    extendedRecordsSql: any;
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
            separator: ',',
            lineBreaks: LineBreaksType.NORMAL
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
        },
        recordComments: {
            open: false,
            commentsData: null
        },
        displaySql: {
            open: false,
            extendedRecordsSql: null
        }
    };
}

export enum LineBreaksType {
    NORMAL = 'NORMAL',
    IS_PRE_WRAP = 'IS_PRE_WRAP',
    IS_PRE_LINE = 'IS_PRE_LINE',
}