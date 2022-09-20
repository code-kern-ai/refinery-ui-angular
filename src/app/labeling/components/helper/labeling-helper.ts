import { ActivatedRoute } from "@angular/router";

export type labelingLinkData = {
    projectId: string
    id: string;
    requestedPos: number;
    linkType: labelingLinkType;
    linkLocked?: boolean;
};

export type labelingHuddle = {
    recordIds: string[],
    partial: boolean
    linkData: labelingLinkData,
    allowedTask: string,
    canEdit: boolean,
    checkedAt: {
        local: Date,
        db: Date
    }
};

export enum labelingLinkType {
    SESSION = "SESSION",
    DATA_SLICE = "DATA_SLICE",
    HEURISTIC = "HEURISTIC"
}
export enum userRoles {
    EXPERT = "EXPERT",
    ANNOTATOR = "ANNOTATOR",
    ENGINEER = "ENGINEER"
}

export function assumeUserRole(userRole: string, linkType: labelingLinkType): string {
    if (userRole == "ANNOTATOR" || userRole == "EXPERT") return userRole;
    switch (linkType) {
        case labelingLinkType.DATA_SLICE:
            return userRoles.EXPERT;
        case labelingLinkType.HEURISTIC:
            return userRoles.ANNOTATOR;
        case labelingLinkType.SESSION:
        default:
            return userRoles.ENGINEER;
    }
}
export function guessLinkType(userRole: string): string {
    switch (userRole) {
        case userRoles.EXPERT:
            return labelingLinkType.DATA_SLICE;
        case userRoles.ANNOTATOR:
            return labelingLinkType.HEURISTIC;
        case userRoles.ENGINEER:
        default:
            return labelingLinkType.SESSION;
    }
}

function linkTypeFromStr(str: string): labelingLinkType {
    if (!str) return labelingLinkType.SESSION;
    switch (str.toUpperCase()) {
        case "DATA_SLICE":
            return labelingLinkType.DATA_SLICE;
        case "HEURISTIC":
            return labelingLinkType.HEURISTIC;
        case "SESSION":
        default:
            return labelingLinkType.SESSION;
    }
}


export function parseLabelingLinkData(route: ActivatedRoute): labelingLinkData {
    const projectId = route.parent.snapshot.paramMap.get('projectId');
    const id = route.snapshot.paramMap.get("id");
    const requestedPosStr = route.snapshot.queryParamMap.get("pos")
    const isPosNumber = !Number.isNaN(Number(requestedPosStr));
    const type = linkTypeFromStr(route.snapshot.queryParamMap.get("type"));

    return {
        projectId: projectId,
        id: id,
        requestedPos: isPosNumber ? Number(requestedPosStr) : 0,
        linkType: type
    }
}
