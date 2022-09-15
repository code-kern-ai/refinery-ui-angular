import { ActivatedRoute } from "@angular/router";

export type labelingLinkData = {
    projectId: string
    id: string;
    requestedPos: number;
    linkType: labelingLinkType;
};

export enum labelingLinkType {
    SESSION = "SESSION",
    DATA_SLICE = "DATA_SLICE",
    HEURISTIC = "HEURISTIC"
}

function linkTypeFromStr(str: string): labelingLinkType {
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
