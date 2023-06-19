import { capitalizeFirst, capitalizeFirstPerWord, caseType } from "./case-types-parser";

export function jsonCopy(src: any): any {
    return JSON.parse(JSON.stringify(src));
}

export function arrayToDict(array: any[], key: string, targetKey?: string): { [key: string]: any } {
    if (!targetKey) {
        return array.reduce((acc: any, entry: any) => {
            acc[getKeyValue(entry, key)] = entry;
            return acc;
        }, {});
    } else return arrayToDictWithKeys(array, key, [targetKey]);
}

export function arrayToDictWithKeys(array: any[], key: string, targetKey: string[]): { [key: string]: any } {
    if (targetKey.length === 1) {
        return array.reduce((acc: any, entry: any) => {
            acc[getKeyValue(entry, key)] = getKeyValue(entry, targetKey[0]);
            return acc;
        }, {});
    }
    else {
        return array.reduce((acc: any, entry: any) => {
            const target: any = {};
            targetKey.forEach((key: string) => {
                target[getKeyName(key)] = getKeyValue(entry, key);
            });
            acc[getKeyValue(entry, key)] = target;
            return acc;
        }, {});
    }
}

function getKeyValue(obj: any, key: string) {
    const keys = key.split('.');
    let target = obj;
    keys.forEach((key: string) => {
        target = target[key];
    });
    return target;
}

function getKeyName(key: string) {
    const keys = key.split('.');
    return keys[keys.length - 1];
}

export function combineClassNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

const TRUE_VALUES = ['true', '1', 'yes', 'y', 'on', 'x'];

export function isStringTrue(value: string): boolean {
    if (!value) return false;
    value = value.toLowerCase();
    return TRUE_VALUES.includes(value);
}

export function copyToClipboard(textToCopy: string) {
    navigator.clipboard.writeText(textToCopy);
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

export function loopNestedDict(dict: any, callback: (key: string, value: any) => void) {
    for (let key in dict) {
        if (typeof dict[key] === 'object') {
            loopNestedDict(dict[key], callback);
        } else {
            callback(key, dict[key]);
        }
    }
}

export function tryParseJSON(str: string): any {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(dm)) + ' ' + sizes[i];
}


export type enumToArrayOptions = {
    caseType?: caseType;
    prefix?: string;
    nameFunction: (name: string) => string;
}

export function enumToArray(e: Object, options: any | null = null): any[] {
    const arr = Object.values(e);
    if (!options) return sortByEnumPos(e, arr);
    let func;
    if (options.caseType == caseType.LOWER) func = (x: any) => x.toLowerCase();
    else if (options.caseType == caseType.UPPER) func = (x: any) => x.toUpperCase();
    else if (options.caseType == caseType.CAPITALIZE_FIRST) func = capitalizeFirst;
    else if (options.caseType == caseType.CAPITALIZE_FIRST_PER_WORD) func = capitalizeFirstPerWord;

    if (func) return enumToArray(e, { prefix: options.prefix, nameFunction: func });
    if (!options.nameFunction) return sortByEnumPos(e, arr.map(x => ({ name: options.prefix + x, value: x })));

    return sortByEnumPos(e, arr.map(x => ({ name: (options.prefix ? options.prefix : "") + options.nameFunction(x), value: x })));
}

function sortByEnumPos(e: any, arr: any[]) {
    const order: string[] = [];
    for (let key in e) {
        order.push(key);
    }
    return arr.sort((a, b) => {
        const index1 = order.findIndex(key => e[key] === a.code);
        const index2 = order.findIndex(key => e[key] === b.code);
        return index1 - index2;
    });
}

const ESCAPE_CHARACTERS = ['\n', '\r', '\t'];
const ESCAPE_CHARACTERS_STRING = ['\\n', '\\r', '\\t'];

export function hasPreEscapeCharacters(str: string): boolean {
    return ESCAPE_CHARACTERS.some(char => str.includes(char));
}
export function replaceStringEscapeCharacters(str: string, toEscaped: boolean = true): string {
    if (toEscaped) {
        ESCAPE_CHARACTERS.forEach((char, index) => {
            str = str.replace(char, ESCAPE_CHARACTERS_STRING[index]);
        });

    } else {
        ESCAPE_CHARACTERS_STRING.forEach((char, index) => {
            str = str.replace(char, ESCAPE_CHARACTERS[index]);
        });
    }
    return str;
}

export function countOcc(str: string, search: string): number {
    let c = 0, p = -1;
    while (true) {
        p = str.indexOf(search, p + 1)
        if (p != -1) c++;
        else break;
    }
    return c;
} 