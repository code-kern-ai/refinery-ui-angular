import { InformationSourceType } from "src/app/base/enum/graphql-enums";

export type HeuristicsModals = {
    deleteSelected: DeleteSelectedModals;
    selectedInformationSources: any[];
    selectionList: string;
    lastWeakSupervision: LastWeakSupervisionModal;
    createLabelingFunction: CreateLabelingFunctionModal;
    createActiveLearning: CreateActiveLearningModal;
    createZeroShot: CreateZeroShotModal;
    createCrowdLabeling: CreateCrowdLabelingModal;
    functionName: string;
    description: string;
    type: InformationSourceType;
};

export type DeleteSelectedModals = {
    open: boolean;
};

export type LastWeakSupervisionModal = {
    open: boolean;
    currentWeakSupervisionRun: any;
};

export type CreateLabelingFunctionModal = {
    open: boolean;
};

export type CreateActiveLearningModal = {
    open: boolean;
    embedding: string;
};

export type CreateZeroShotModal = {
    open: boolean;
    value: string;
    currentRecommendation: any;
    hideZeroShotAttribute: boolean;
    zeroShotRecommendations: any[];
};

export type CreateCrowdLabelingModal = {
    open: boolean;
};

export function createDefaultHeuristicsModals(): HeuristicsModals {
    return {
        deleteSelected: {
            open: false
        },
        selectedInformationSources: [],
        selectionList: '',
        lastWeakSupervision: {
            open: false,
            currentWeakSupervisionRun: null
        },
        createLabelingFunction: {
            open: false
        },
        createActiveLearning: {
            open: false,
            embedding: ''
        },
        createZeroShot: {
            open: false,
            value: '',
            currentRecommendation: null,
            hideZeroShotAttribute: false,
            zeroShotRecommendations: []
        },
        createCrowdLabeling: {
            open: false
        },
        functionName: '',
        description: '',
        type: InformationSourceType.LABELING_FUNCTION
    };
}