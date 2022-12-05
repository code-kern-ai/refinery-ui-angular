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
    UNKNOWN = "UNKNOWN",
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
        }
        id: number
    }
    meta: {}
}
export type BricksSearchData = {
    attributes: {
        name: string,
        description: string,
        updatedAt: string,
        moduleType: string,
        [key: string]: unknown
    }
    id: number
    visible?: boolean
}

export type BricksIntegratorConfig = {
    modalOpen: boolean,
    canAccept: boolean,
    overviewCodeOpen: boolean,
    integratorCodeOpen: boolean,
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
}

export function getEmptyBricksIntegratorConfig(): BricksIntegratorConfig {
    return {
        modalOpen: false,
        canAccept: false,
        overviewCodeOpen: false,
        integratorCodeOpen: false,
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

