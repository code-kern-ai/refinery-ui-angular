export type HeuristicsDetailsModals = {
    deleteHeuristic: DeleteHeuristicModal;
    attributeDetails: AttributeDetailsModal;
};

export type DeleteHeuristicModal = {
    open: boolean;
};

export type AttributeDetailsModal = {
    open: boolean;
    currentRecordIdx: number;
};

export function createDefaultHeuristicsDetailsModals(): HeuristicsDetailsModals {
    return {
        deleteHeuristic: {
            open: false
        },
        attributeDetails: {
            open: false,
            currentRecordIdx: -1
        }
    };
}