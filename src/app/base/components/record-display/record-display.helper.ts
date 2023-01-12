import { DataBrowserModals } from "src/app/data/components/data-browser/helper-classes/modals-helper";

export type RecordDisplayOptions = {
    /**
     * Options set for kern record card
     * @attributesSortOrder {AttributeSort[] | any[], optional} - Array of sorted attributes to be displayed
     * @dataBrowserModals {DataBrowserModals, optional} - Data browser modals with specific fields
     * @textHighlightArrayKern {string[], optional} - Array of text to be highlighted
     * @isTextHighlightNeeded {[key: string]: boolean, optional} - Flag to check if text highlight is needed
    */
    attributesSortOrder?: AttributeSort[] | any[];
    dataBrowserModals?: DataBrowserModals;
    textHighlightArrayKern?: string[];
    isTextHighlightNeeded?: { [key: string]: boolean };
};

export type AttributeSort = {
    key: string;
    name: string;
    order: number;
    type: string;
};

export type RecordDisplay = {
    data: {
        [k: string]: any;
    };
    [k: string]: any;
};

export type Attributes = {
    [id: string]: any;
}