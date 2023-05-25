import { capitalizeFirst, capitalizeFirstPerWord } from "submodules/javascript-functions/case-types-parser";
import { InformationSourceType, informationSourceTypeToString } from "../base/enum/graphql-enums";

export function parseLinkFromText(link: string) {
    if (!link) return null;
    let linkData: any = {
        protocol: window.location.protocol,
        host: window.location.host,
        inputLink: "" + link,
        queryParams: {}
    }
    if (link.startsWith(linkData.protocol)) link = link.substring(linkData.protocol.length);
    if (link.startsWith("//")) link = link.substring(2);
    if (link.startsWith(linkData.host)) link = link.substring(linkData.host.length);
    if (link.startsWith("/refinery")) link = link.substring(9);
    if (link.indexOf("?") > -1) {
        let params = link.split("?");
        linkData.route = params[0];
        params = params[1].split("&");
        params.forEach(param => {
            let keyValue = param.split("=");
            linkData.queryParams[keyValue[0]] = keyValue[1];
        })
    } else {
        linkData.route = link;
    }

    linkData.fullUrl = linkData.protocol + '//' + linkData.host + "/refinery" + linkData.route;
    if (linkData.queryParams) linkData.fullUrl += "?" + Object.keys(linkData.queryParams).map(key => key + "=" + linkData.queryParams[key]).join("&");


    return linkData;
}


export function parseLogData(logs: string[], isType: InformationSourceType = null) {
    if (!logs) {
        if (isType) return [`Running ${informationSourceTypeToString(isType, false)}...`];
        else return null;
    }
    if (!Array.isArray(logs)) return null;
    if (logs.length == 0) return [];

    let neededIDLength = String(logs.length)?.length;
    return logs.map((wrapper, index) => {
        const d: Date = new Date(wrapper.substr(0, wrapper.indexOf(' ')));
        return (
            String(index + 1).padStart(neededIDLength, '0') +
            ': ' +
            d.toLocaleString() +
            ' - ' +
            wrapper.substr(wrapper.indexOf(' ') + 1)
        );
    });
}

export enum caseType {
    LOWER,
    UPPER,
    CAPITALIZE_FIRST,
    CAPITALIZE_FIRST_PER_WORD
}

export type enumToArrayOptions = {
    caseType?: caseType;
    prefix?: string;
    nameFunction?: (name: string) => string;
}

export function enumToArray(e: Object, options: enumToArrayOptions = null): any[] {
    const arr = Object.values(e);
    if (!options) return sortByEnumPos(e, arr);
    let func;
    if (options.caseType == caseType.LOWER) func = (x) => x.toLowerCase();
    else if (options.caseType == caseType.UPPER) func = (x) => x.toUpperCase();
    else if (options.caseType == caseType.CAPITALIZE_FIRST) func = capitalizeFirst;
    else if (options.caseType == caseType.CAPITALIZE_FIRST_PER_WORD) func = capitalizeFirstPerWord;

    if (func) return enumToArray(e, { prefix: options.prefix, nameFunction: func });
    if (!options.nameFunction) return sortByEnumPos(e, arr.map(x => ({ name: options.prefix + x, value: x })));
    return sortByEnumPos(e, arr.map(x => ({ name: (options.prefix ? options.prefix : "") + options.nameFunction(x), value: x })));
}

function sortByEnumPos(e: Object, arr: any[]) {
    const order = [];
    for (let key in e) {
        order.push(key);
    }
    return arr.sort((a, b) => {
        const index1 = order.findIndex(key => e[key] === a.code);
        const index2 = order.findIndex(key => e[key] === b.code);
        return index1 - index2;
    });
}

export function getUserAvatarUri(user) {
    let avatarId = 0;
    if (user && user.firstName && user.lastName) {
        avatarId = (user.firstName[0].charCodeAt(0) + user.lastName[0].charCodeAt(0)) % 5;
    }
    return "assets/avatars/" + avatarId + ".png";
}

export function getColorForDataType(dataType): string {
    switch (dataType) {
        case 'CATEGORY': return 'amber';
        case 'TEXT': return 'lime';
        case 'BOOLEAN': return 'cyan';
        case 'INTEGER': return 'indigo';
        case 'FLOAT': return 'purple';
        default: return 'gray';
    }
}
