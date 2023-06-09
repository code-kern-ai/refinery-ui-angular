export function toPythonFunctionName(str: string, prefix: string = '_') {
    str = str.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/gi, '').trim();
    return /^\d/.test(str) ? (prefix + str) : str;
}

export function asPythonVariable(baseName: string, prefix: string = '_') {
    baseName = baseName.toLowerCase().replace(/ /g, "_").replace(/[^\w]/gi, '').trim();
    return /^\d/.test(baseName) ? (prefix + baseName) : baseName;
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