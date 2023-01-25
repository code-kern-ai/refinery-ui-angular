import { AttributeVisibility } from "../../create-new-attribute/attributes-visibility-helper";

export type Attribute = {
    id: string;
    name: string;
    dataType: string;
    isPrimaryKey: boolean;
    sourceCode: string;
    visibility: AttributeVisibility;
    userCreated: boolean;
    state: string;
    logs: any[];
    relativePosition: number;
    dataTypeName?: string;
    visibilityIndex?: number;
}

export type AttributeVisibilityStates = {
    name: string;
    value: string;
};