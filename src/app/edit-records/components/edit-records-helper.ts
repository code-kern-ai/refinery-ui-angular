import { isStringTrue } from "submodules/javascript-functions/general";

export type EditRecordSessionData = {
    records: any[],
    selectedRecordId: string,
    attributes: any[],
}

export type EditRecordComponentData = {
    projectId: string,
    loading: boolean,
    navBar: {
        nextDisabled: boolean,
        prevDisabled: boolean,
        positionString: string,
    },
    columnClass: string,
    modals: {
        explainModalOpen: boolean,
        hideExplainModal: boolean,
        syncModalOpen: boolean,
        syncModalAmount: number,
    }
    data?: EditRecordSessionData,
    editRecordId?: string,
    displayRecords?: any[],
    syncing: boolean,
    errors: string[],
    cachedRecordChanges: {
        [accessKey: string]: {
            recordId: string,
            attributeName: string,
            newValue: any,
            subKey?: number,
            //only for display frontend, remove before sending to backend
            display: {
                record: string,
                oldValue: string,
                subKeyAdd?: string,
            }
        }
    },

}

export function createDefaultEditRecordComponentData(): EditRecordComponentData {
    const columnClass = localStorage.getItem("ERcolumnClass") ?? "grid-cols-3";
    const hideExplainModal = localStorage.getItem("ERhideExplainModal");
    return {
        projectId: null,
        loading: true,
        syncing: false,
        errors: null,
        columnClass: columnClass,
        modals: {
            explainModalOpen: false,
            hideExplainModal: isStringTrue(hideExplainModal),
            syncModalOpen: false,
            syncModalAmount: -1,
        },
        navBar: {
            nextDisabled: true,
            prevDisabled: true,
            positionString: null,
        },
        cachedRecordChanges: {},
    };
}

