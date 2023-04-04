import { ConfigManager } from "src/app/base/services/config-service";
import { UserManager } from "src/app/util/user-manager";
import { BricksVariableType } from "./type-helper";

export enum DummyNodes {
    CODE_TESTER = -1,
    CODE_PARSER = -2
}

export function getDummyNodeByIdForApi(id: DummyNodes): any {
    const baseNode = {
        data: {
            attributes: {
                name: null,
                description: null,
                updatedAt: null,
                sourceCode: null,
                issueId: null,
                inputExample: null,
                endpoint: null,
                moduleType: null
            },
            id: null
        },
        meta: {}
    }
    switch (id) {
        case DummyNodes.CODE_TESTER:
            baseNode.data.id = DummyNodes.CODE_TESTER;
            baseNode.data.attributes.name = "Code tester";
            baseNode.data.attributes.description = "Lets you test random code for the integrator (only available for kern admins)";
            return baseNode;
        case DummyNodes.CODE_PARSER:
            baseNode.data.id = DummyNodes.CODE_PARSER;
            baseNode.data.attributes.name = "Code parser";
            baseNode.data.attributes.description = "Lets you parse random code to the new structure (only available for kern admins)";
            return baseNode;
    }
}

function getDummyNodeByIdForSelection(id: DummyNodes): any {
    const baseNode = {
        id: null,
        attributes: {
            name: null,
            description: null,
            moduleType: "any",
            dataType: "text",
            sourceCode: null,
        },
        visible: true
    }
    switch (id) {
        case DummyNodes.CODE_TESTER:
            baseNode.id = DummyNodes.CODE_TESTER;
            baseNode.attributes.name = "Code tester";
            baseNode.attributes.description = "Lets you test random code for the integrator (only available for kern admins)";
            return baseNode;
        case DummyNodes.CODE_PARSER:
            baseNode.id = DummyNodes.CODE_PARSER;
            baseNode.attributes.name = "Code parser";
            baseNode.attributes.description = "Lets you parse random code to the new structure (only available for kern admins)";
            return baseNode;
    }
}

export function extendDummyElements(finalData: any[]) {
    if (!ConfigManager.getIsAdmin()) return;
    addElementToList(finalData, getDummyNodeByIdForSelection(DummyNodes.CODE_TESTER));
    addElementToList(finalData, getDummyNodeByIdForSelection(DummyNodes.CODE_PARSER));
}

function addElementToList(finalData: any[], element: any) {
    if (UserManager.getUser().firstName.toLowerCase() == "jens") finalData.unshift(element);
    else finalData.push(element);
}


export function getTextForRefineryType(type: BricksVariableType, asEnum: boolean) {
    switch (type) {
        case BricksVariableType.ATTRIBUTE:
            if (asEnum) return "RefineryType.ATTRIBUTE.value";
            else return "attribute";
        case BricksVariableType.EMBEDDING:
            if (asEnum) return "RefineryType.EMBEDDING.value";
            else return "embedding";
        case BricksVariableType.LABEL:
            if (asEnum) return "RefineryType.LABEL.value";
            else return "label";
        case BricksVariableType.LABELING_TASK:
            if (asEnum) return "RefineryType.LABELING_TASK.value";
            else return "labeling_task";
        case BricksVariableType.LOOKUP_LIST:
            if (asEnum) return "RefineryType.LOOKUP_LIST.value";
            else return "lookup_list";
    }
    return null;
}

export function getAddInfo(type: BricksVariableType, asEnum: boolean): string[] {
    const list = [];
    switch (type) {
        case BricksVariableType.ATTRIBUTE:
        case BricksVariableType.EMBEDDING:
        case BricksVariableType.LABEL:
        case BricksVariableType.LABELING_TASK:
        case BricksVariableType.LOOKUP_LIST:
            list.push("RefineryType.GENERIC_STRING.value");
            break;
    }

    if (asEnum) list.unshift("BricksVariableType." + type + ".value");
    else list.unshift(type.toLowerCase());

    return list;
}
export function getSelectionType(type: BricksVariableType, asEnum: boolean) {
    switch (type) {
        case BricksVariableType.ATTRIBUTE:
        case BricksVariableType.GENERIC_STRING:
        case BricksVariableType.EMBEDDING:
        case BricksVariableType.LABEL:
        case BricksVariableType.LABELING_TASK:
        case BricksVariableType.LOOKUP_LIST:
            if (asEnum) return "SelectionType.CHOICE.value";
            else return "choice";
        case BricksVariableType.LANGUAGE:
        case BricksVariableType.REGEX:
            if (asEnum) return "SelectionType.STRING.value";
            else return "string";
        case BricksVariableType.GENERIC_INT:
            if (asEnum) return "SelectionType.INT.value";
            else return "string";
        case BricksVariableType.GENERIC_FLOAT:
            if (asEnum) return "SelectionType.FLOAT.value";
            else return "string";
        case BricksVariableType.GENERIC_BOOLEAN:
            if (asEnum) return "SelectionType.BOOLEAN.value";
            else return "string";
    }
    return null;
}