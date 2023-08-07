import { Attribute } from "../entities/attribute.type";

export enum EmbeddingType {
    ON_ATTRIBUTE = "ON_ATTRIBUTE",
    ON_TOKEN = "ON_TOKEN"
};

export const granularityTypesArray = [
    { name: 'Attribute', value: EmbeddingType.ON_ATTRIBUTE },
    { name: 'Token', value: EmbeddingType.ON_TOKEN }
];

// A string enum with different values from our standard is used because of its usage in the embedder service
export enum PlatformType {
    HUGGING_FACE = "huggingface",
    OPEN_AI = "openai",
    COHERE = "cohere",
    PYTHON = "python",
    AZURE = "azure"
}

export const platformNamesDict = {
    [PlatformType.HUGGING_FACE]: "Hugging Face",
    [PlatformType.OPEN_AI]: "Open AI",
    [PlatformType.COHERE]: "Cohere",
    [PlatformType.PYTHON]: "Python",
    [PlatformType.AZURE]: "Azure"
}

export function getMoveRight(tblName: string): boolean {
    //at some point a better grouping would be useful
    switch (tblName) {
        case "embedding tensors":
        case "information sources payloads":
            return true;
        default:
            return false;
    }
}

export function findFreeAttributeName(attributes: Attribute[]): string {
    const regEx = "^attribute_([0-9]+)$"
    let counterList = [];
    for (const item of attributes) {
        const match = item.name.match(regEx);
        if (match) counterList.push(parseInt(match[1]));
    }
    return "attribute_" + (counterList.length > 0 ? (Math.max(...counterList) + 1) : (attributes.length + 1));
}

export const DEFAULT_AZURE_TYPE = 'azure';
export const DEFAULT_AZURE_MODEL = 'text-embedding-ada-002';
export const DEFAULT_AZURE_VERSION = '2023-05-15';