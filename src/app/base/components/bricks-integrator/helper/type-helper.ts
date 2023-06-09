import { Subscription } from "rxjs"

export enum IntegratorPage {
    SEARCH = "SEARCH",
    OVERVIEW = "OVERVIEW",
    INPUT_EXAMPLE = "INPUT_EXAMPLE",
    INTEGRATION = "INTEGRATION",
}

export enum BricksVariableType {
    ATTRIBUTE = "ATTRIBUTE",
    LANGUAGE = "LANGUAGE",
    LABELING_TASK = "LABELING_TASK",
    LABEL = "LABEL",
    EMBEDDING = "EMBEDDING",
    LOOKUP_LIST = "LOOKUP_LIST",
    REGEX = "REGEX",
    GENERIC_STRING = "GENERIC_STRING",
    GENERIC_INT = "GENERIC_INT",
    GENERIC_FLOAT = "GENERIC_FLOAT",
    GENERIC_BOOLEAN = "GENERIC_BOOLEAN",
    GENERIC_CHOICE = "GENERIC_CHOICE",
    GENERIC_RANGE = "GENERIC_RANGE",
    UNKNOWN = "UNKNOWN",
}

export enum RefineryDataType {
    CATEGORY = "category",
    TEXT = "text",
    INTEGER = "integer",
    FLOAT = "float",
    BOOLEAN = "boolean",
}
export enum SelectionType {
    STRING = "string",
    CHOICE = "choice",
    RANGE = "range",
}
export enum StringBoolean {
    TRUE = "true",
    FALSE = "false",
}

export type BricksAPIData = {
    data: {
        attributes: {
            name: string,
            description: string,
            updatedAt: string,
            sourceCode: string,
            issueId: number,
            inputExample: string,
            endpoint: string,
            moduleType: string,
            [key: string]: unknown
            //v2 additions and also the check what parser should be used
            integratorInputs?: IntegratorInput,
            availableFor?: string[],
            partOfGroup?: string[],
            sourceCodeRefinery?: string
        }
        id: number
    }
    meta: {}
}

export type IntegratorInput = {
    name: string
    refineryDataType: RefineryDataType,
    globalComment?: string,
    outputs?: string[],
    variables: {
        [variableName: string]: IntegratorInputVariable
    }
}
export type IntegratorInputVariable = {
    selectionType: SelectionType,
    allowedValues?: string[],
    allowedValueRange?: number[],
    defaultValue?: string,
    description?: string,
    optional?: StringBoolean,
    addInfo?: BricksVariableType[],
    acceptsMultiple?: StringBoolean,
}



export type BricksSearchData = {
    attributes: {
        name: string,
        description: string,
        updatedAt: string,
        moduleType: string,
        link?: string,
        [key: string]: unknown,
        //V2 values
        availableFor?: string[],
        partOfGroup?: string[],
    }
    id: number
    searchVisible?: boolean
    groupVisible?: boolean
}

export type BricksIntegratorConfig = {
    modalOpen: boolean,
    canAccept: boolean,
    overviewCodeOpen: boolean,
    integratorCodeOpen: boolean,
    integratorParseOpen: boolean,
    page: IntegratorPage,
    copied: boolean,
    api: {
        requesting: boolean,
        moduleId: number,
        requestUrl: string,
        data: BricksAPIData,
    },
    example: {
        requesting: boolean,
        requestUrl: string,
        requestData: string,
        returnData: string,
    },
    search: {
        requesting: boolean,
        searchValue: string,
        lastRequestUrl: string,
        requestData: string,
        debounce: Subscription,
        results: BricksSearchData[],
        nothingMatches: boolean,
        currentRequest: Subscription
    }
    codeFullyPrepared: boolean,
    preparedCode: string,
    preparedJson: string,
    prepareJsonAsPythonEnum: boolean,
    prepareJsonRemoveYOUR: boolean,
    extendedIntegrator: boolean,
    groupFilterOptions: GroupFilterOptions,
    extendedIntegratorGroupFilterOpen: boolean,
    querySourceSelectionOpen: boolean,
    querySourceSelectionRemote: boolean,
    querySourceSelectionLocalStrapiPort: number,
    querySourceSelectionLocalStrapiToken: string,
    querySourceSelectionLocalBricksPort: number,
    extendedIntegratorOverviewAddInfoOpen: boolean,
    extendedIntegratorNewParse: boolean,
}

export type GroupFilterOptions = {
    filterValues: {
        [key: string]: GroupFilterOption
    }
    filterValuesArray: GroupFilterOption[]
}

export type GroupFilterOption = {
    key: string,
    name: string,
    active: boolean,
    countInGroup: number,
}

export function getEmptyBricksIntegratorConfig(): BricksIntegratorConfig {
    return {
        modalOpen: false,
        canAccept: false,
        overviewCodeOpen: false,
        integratorCodeOpen: false,
        integratorParseOpen: true,
        page: IntegratorPage.SEARCH,
        copied: false,
        api: {
            requesting: false,
            moduleId: null,
            requestUrl: null,
            data: null,
        },
        example: {
            requesting: false,
            requestUrl: null,
            requestData: null,
            returnData: null,
        },
        search: {
            requesting: false,
            searchValue: null,
            lastRequestUrl: null,
            requestData: null,
            debounce: null,
            results: [],
            nothingMatches: false,
            currentRequest: null
        },
        codeFullyPrepared: false,
        preparedCode: null,
        preparedJson: null,
        prepareJsonAsPythonEnum: true,
        prepareJsonRemoveYOUR: true,
        extendedIntegrator: false,
        groupFilterOptions: {
            filterValues: {},
            filterValuesArray: []
        },
        extendedIntegratorGroupFilterOpen: false,
        querySourceSelectionOpen: false,
        querySourceSelectionRemote: true,
        querySourceSelectionLocalStrapiPort: 1337,
        querySourceSelectionLocalStrapiToken: "",
        querySourceSelectionLocalBricksPort: 8000,
        extendedIntegratorOverviewAddInfoOpen: false,
        extendedIntegratorNewParse: true,
    }
}
export type BricksVariable = {
    line: string,
    replacedLine: string,
    baseName: string,
    displayName: string,
    values: string[],
    allowedValues: any,
    pythonType: string,
    canMultipleValues: boolean,
    comment: string,
    optional: boolean,
    type: BricksVariableType
    options: {
        colors?: string[],
    }
}

export function getEmptyBricksVariable(): BricksVariable {
    return {
        line: null,
        replacedLine: null,
        baseName: null,
        displayName: null,
        values: [null],
        allowedValues: null,
        pythonType: null,
        canMultipleValues: false,
        type: null,
        comment: null,
        optional: false,
        options: {}
    }
}


export function bricksVariableNeedsTaskId(variableType: BricksVariableType): boolean {
    switch (variableType) {
        case BricksVariableType.EMBEDDING:
        case BricksVariableType.LABEL:
            return true;
        default:
            return false;
    }
}

export type BricksExpectedLabels = {
    expectedTaskLabels: ExpectedLabel[];
    labelsToBeCreated: number;
    labelWarning: boolean;
    canCreateTask: boolean;
    labelMappingActive: boolean;
    availableLabels: any[];
}
export function getEmptyBricksExpectedLabels(): BricksExpectedLabels {
    return {
        expectedTaskLabels: [],
        labelsToBeCreated: null,
        labelWarning: false,
        canCreateTask: false,
        labelMappingActive: false,
        availableLabels: [],
    }
}

export type ExpectedLabel = {
    label: string,
    exists: boolean,
    backgroundColor: string,
    borderColor: string,
    textColor: string,
    mappedLabel?: string,
}

export function canHaveDefaultValue(vType: BricksVariableType): boolean {
    switch (vType) {
        case BricksVariableType.REGEX:
        case BricksVariableType.GENERIC_STRING:
        case BricksVariableType.GENERIC_INT:
        case BricksVariableType.GENERIC_FLOAT:
        case BricksVariableType.GENERIC_BOOLEAN:
        case BricksVariableType.GENERIC_CHOICE:
            return true;
        default: return false;
    }

}
function isSpecialChoiceType(vType: BricksVariableType): boolean {
    switch (vType) {
        case BricksVariableType.ATTRIBUTE:
        case BricksVariableType.LANGUAGE:
        case BricksVariableType.LABELING_TASK:
        case BricksVariableType.LABEL:
        case BricksVariableType.EMBEDDING:
        case BricksVariableType.LOOKUP_LIST:
            return true;
        default: return false;
    }
}

export function getChoiceType(selectionType: SelectionType, addInfo: string[]): BricksVariableType {
    if (selectionType != SelectionType.CHOICE) return BricksVariableType.UNKNOWN;
    if (addInfo.length == 0) return BricksVariableType.GENERIC_CHOICE;

    for (let x of addInfo) {
        const type = x.toUpperCase() as BricksVariableType;
        if (isSpecialChoiceType(type)) return type;
    }

    return BricksVariableType.GENERIC_CHOICE;

}