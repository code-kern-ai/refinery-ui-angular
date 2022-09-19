
export type CrowdLabelerHeuristicSettings = {
    taskId?: string;
    dataSliceId: string;
    annotatorId: string;
    accessLinkId: string;
    accessLink?: any;
    accessLinkParsed?: string;
    accessLinkLocked?: boolean;
    isHTTPS?: boolean;
};


export function parseCrowdSettings(settingsJson: string): CrowdLabelerHeuristicSettings {
    const tmp = JSON.parse(settingsJson);
    return {
        dataSliceId: tmp.data_slice_id,
        annotatorId: tmp.annotator_id,
        accessLinkId: tmp.access_link_id
    }
}

export function parseToSettingsJson(settings: CrowdLabelerHeuristicSettings): string {
    const tmp = {
        data_slice_id: settings.dataSliceId,
        annotator_id: settings.annotatorId,
        access_link_id: settings.accessLinkId
    }
    return JSON.stringify(tmp);
}


export function buildFullLink(route: string) {
    return window.location.protocol + '//' + window.location.host + "/app" + route;
}