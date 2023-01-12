import { AttributeSort } from "src/app/base/components/record-display/record-display.helper";
import { DataBrowserModals, RecordCommentsModal } from "../data-browser/helper-classes/modals-helper";
import { SimilarSearch } from "../data-browser/helper-classes/search-similar";

export type RecordListOptions = {
    /**
     * Options set for kern record list
     * @recordComments {RecordCommentsModal, optional} - Record comments modal with specific fields
     * @dataBrowserModals {DataBrowserModals, optional} - Data browser modals with specific fields
     * @similarSearchHelper {SimilarSearch, optional} - Similar search helper
     * @attributesSortOrder {AttributeSort[], optional} - Array of sorted attributes to be displayed
     * @textHighlightArrayKern {string[], optional} - Array of text to be highlighted
     * @isTextHighlightNeeded {[key: string]: boolean, optional} - Flag to check if text highlight is needed

     */
    recordComments?: RecordCommentsModal;
    dataBrowserModals?: DataBrowserModals;
    similarSearchHelper?: SimilarSearch;
    attributesSortOrder: AttributeSort[];
    textHighlightArrayKern?: string[];
    isTextHighlightNeeded?: { [key: string]: boolean };

};

export type ColumnData = {
    field: string;
    displayName: string;
    order: number;
};