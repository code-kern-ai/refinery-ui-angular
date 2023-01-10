import { DataBrowserModals, RecordCommentsModal } from "src/app/data/components/data-browser/helper-classes/modals-helper";
import { SimilarSearch } from "src/app/data/components/data-browser/helper-classes/search-similar";
import { ActiveSearchParams, AttributeSort, DataBrowserRecord } from "./record-card.types";

export type RecordCardOptions = {
    /**
     * Options set for kern record card
     * @attributesSortOrder {AttributeSort[], optional} - Array of sorted attributes to be displayed
     * @dataBrowserModals {DataBrowserModals, optional} - Data browser modals with specific fields
     * @indexExtendedRecord {number, optional} - Index of the extended record in the record list
     * @recordList {DataBrowserRecord[], optional} - Array of records to be displayed
     * @sessionId {string, optional} - Session id of the extended record
     * @recordComments {RecordCommentsModal, optional} - Record comments modal with specific fields
     * @activeSearchParams {ActiveSearchParams, optional} - Active search params
     * @similarSearchHelper {SimilarSearch, optional} - Similar search helper
     * @textHighlightArrayKern {string[], optional} - Array of text to be highlighted
     * @isTextHighlightNeeded {[key: string]: boolean, optional} - Flag to check if text highlight is needed
    */
    attributesSortOrder?: AttributeSort[];
    dataBrowserModals?: DataBrowserModals;
    indexExtendedRecord?: number;
    recordList?: DataBrowserRecord[];
    sessionId?: string;
    recordComments?: RecordCommentsModal;
    activeSearchParams?: ActiveSearchParams;
    similarSearchHelper?: SimilarSearch;
    textHighlightArrayKern?: string[];
    isTextHighlightNeeded?: { [key: string]: boolean };
};