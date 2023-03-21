import { ActivatedRoute } from "@angular/router";
import { InformationSourceType, informationSourceTypeToString } from "../base/enum/graphql-enums";

export function parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
}

export function dateAsUTCDate(date: Date) {
    let d = new Date();
    d.setUTCFullYear(date.getFullYear());
    d.setUTCMonth(date.getMonth());
    d.setUTCDate(date.getDate());
    d.setUTCHours(date.getHours());
    d.setUTCMinutes(date.getMinutes());
    d.setUTCSeconds(date.getSeconds());
    d.setUTCMilliseconds(date.getMilliseconds());
    return d;
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(dm)) + ' ' + sizes[i];
}


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

const TRUE_VALUES = ['true', '1', 'yes', 'y', 'on', 'x'];

export function isStringTrue(value: string): boolean {
    if (!value) return false;
    value = value.toLowerCase();
    return TRUE_VALUES.includes(value);
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

export function capitalizeFirstPerWord(str: string) {
    str = str.replace(/_/g, ' ');
    const parts = str.split(" ");
    for (let i = 0; i < parts.length; i++) {
        parts[i] = capitalizeFirst(parts[i]);
    }
    return parts.join(" ");
}

export function camelCaseToDashCase(str: string) {
    return str.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
}
export function snakeCaseToCamelCase(str:string){
    return str.toLowerCase().replace(/([_][a-z])/g, group =>
    group
      .toUpperCase()
      .replace('_', '')
  );
}

export function capitalizeFirst(str: string) {
    str = str.replace(/_/g, ' ');
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}


export function findProjectIdFromRoute(route: ActivatedRoute): string {
    while (route.parent) {
        route = route.parent;
        if (route.snapshot.params.projectId) {
            return route.snapshot.params.projectId;
        }
    }
    return null;
}

export function copyToClipboard(textToCopy: string) {
    navigator.clipboard.writeText(textToCopy);
}
export function toPythonFunctionName(str: string, prefix: string = '_') {
    str = str.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/gi, '').trim();
    return /^\d/.test(str) ? (prefix + str) : str;
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



export function asPythonVariable(baseName: string, prefix: string = '_') {
    baseName = baseName.toLowerCase().replace(/ /g, "_").replace(/[^\w]/gi, '').trim();
    return /^\d/.test(baseName) ? (prefix + baseName) : baseName;
}

export function tryParseJSON(str: string): any {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}


export function getPythonFunctionName(codeToCheck: string): string {
    var regMatch: any = getPythonFunctionRegExMatch(codeToCheck);
    if (!regMatch) return '@@unknown@@';
    return regMatch[2];
}

export function getPythonFunctionRegExMatch(codeToCheck: string): any {
    return /(def)\s(\w+)\([a-zA-Z0-9_:\[\]=, ]*\)/.exec(codeToCheck);
}


export function getPythonClassName(codeToCheck: string): string {
    var regMatch: any = getPythonClassRegExMatch(codeToCheck);
    if (!regMatch) return '@@unknown@@';
    return regMatch[1];
}

export function getPythonClassRegExMatch(codeToCheck: string): any {
    return /class ([\w]+)\([^)]+\):/.exec(codeToCheck);
}

export function jsonCopy(src): any {
    return JSON.parse(JSON.stringify(src));
}


export function loopNestedDict(dict: any, callback: (key: string, value: any) => void) {
    for (let key in dict) {
        if (typeof dict[key] === 'object') {
            loopNestedDict(dict[key], callback);
        } else {
            callback(key, dict[key]);
        }
    }
}

export function capitalizeFirstForClassName(str: string) {
    if (str.indexOf(" ") == -1) return str.charAt(0).toUpperCase() + str.slice(1);
    const parts = str.split(" ");
    for (let i = 0; i < parts.length; i++) {
        if (i == parts.length - 1) parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase(); // if space, replace the last part it with a capital letter
        else parts[i] = parts[i];
    }
    return parts.join("");
}

/**
 * transfer values from dictA to dictB, if the key is not present in dictB, it will be ignored or created.
 * @param  {dictionary[]} dictA holds data that should be transferred.
 * @param  {dictionary[]} dictB holds data that should be overwritten if existing in dictA.
 * @param  {boolean} ignoreNoneExistingKeys - optional - decides weather none existent keys are created or ignored.
 */
export function transferNestedDict(dictA: any, dictB: any, ignoreNoneExistingKeys: boolean = true) {
    if (dictA == null || dictB == null) return;
    if (typeof dictA !== 'object' || typeof dictB !== 'object') return;

    for (let key in dictA) {
        if (dictB[key] == null && ignoreNoneExistingKeys) continue;
        if (typeof dictA[key] === 'object') {
            if (typeof dictB[key] !== 'object') {
                dictB[key] = {};
            }
            transferNestedDict(dictA[key], dictB[key], ignoreNoneExistingKeys);
        } else {
            dictB[key] = dictA[key];
        }
    }
}