import { ConfigManager } from "src/app/base/services/config-service";
import { UserManager } from "src/app/util/user-manager";

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
