import { InformationSourceType, informationSourceTypeToString } from "../base/enum/graphql-enums";


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
    if (link.startsWith("/app")) link = link.substring(4);
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

    linkData.fullUrl = linkData.protocol + '//' + linkData.host + "/app" + linkData.route;
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