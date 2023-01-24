import { Attribute } from "../entities/attribute.type";

export const granularityTypesArray = [
    { name: 'Attribute', value: 'ON_ATTRIBUTE' },
    { name: 'Token', value: 'ON_TOKEN' }
];

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