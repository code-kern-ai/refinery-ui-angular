export enum AttributeVisibility {
    HIDE = 'HIDE',
    HIDE_ON_LABELING_PAGE = 'HIDE_ON_LABELING_PAGE',
    HIDE_ON_DATA_BROWSER = 'HIDE_ON_DATA_BROWSER',
    DO_NOT_HIDE = 'DO_NOT_HIDE',
}

export const attributeVisibilityStates = [
    { name: 'Do not hide', value: AttributeVisibility.DO_NOT_HIDE },
    { name: 'Hide on data browser', value: AttributeVisibility.HIDE_ON_DATA_BROWSER },
    { name: 'Hide on labeling page', value: AttributeVisibility.HIDE_ON_LABELING_PAGE },
    { name: 'Hide', value: AttributeVisibility.HIDE },
];

export function getTooltipVisibilityState(state: AttributeVisibility): string {
    switch (state) {
        case AttributeVisibility.DO_NOT_HIDE:
            return 'The attribute is visible on all pages.';
        case AttributeVisibility.HIDE_ON_LABELING_PAGE:
            return 'The attribute is hidden on labeling page and data browser.';
        case AttributeVisibility.HIDE_ON_DATA_BROWSER:
            return 'The attribute is hidden on data browser, but not on labeling page.';
        case AttributeVisibility.HIDE:
            return 'The attribute is hidden on all pages.';
    }
    return 'UNKNOWN';
}