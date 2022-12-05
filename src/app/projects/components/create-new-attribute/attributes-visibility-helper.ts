export enum AttributeVisibility {
    HIDE = 'HIDE',
    HIDE_ON_LABELING_PAGE = 'HIDE_ON_LABELING_PAGE',
    HIDE_ON_DATA_BROWSER = 'HIDE_ON_DATA_BROWSER',
    DO_NOT_HIDE = 'DO_NOT_HIDE',
}

export const attributeVisibilityStates = [
    { name: 'Hide', value: AttributeVisibility.HIDE },
    { name: 'Hide on labeling page', value: AttributeVisibility.HIDE_ON_LABELING_PAGE },
    { name: 'Hide on data browser', value: AttributeVisibility.HIDE_ON_DATA_BROWSER },
    { name: 'Do not hide', value: AttributeVisibility.DO_NOT_HIDE }
];