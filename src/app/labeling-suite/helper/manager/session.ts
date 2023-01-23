import { ActivatedRoute } from "@angular/router";
import { UserRole } from "src/app/base/enum/graphql-enums";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { LabelingSuiteManager } from "./manager";


export type LabelingLinkData = {
    projectId: string;
    id: string;
    requestedPos: number;
    linkType: LabelingLinkType;
    linkLocked?: boolean;
};

export type LabelingHuddle = {
    recordIds: string[];
    partial: boolean;
    linkData: LabelingLinkData;
    allowedTask: string;
    canEdit: boolean;
    checkedAt: {
        local: Date;
        db: Date;
    };
};

export enum LabelingLinkType {
    SESSION = 'SESSION',
    DATA_SLICE = 'DATA_SLICE',
    HEURISTIC = 'HEURISTIC',
}

export class LabelingSuiteSessionManager implements DoBeforeDestroy {

    private baseManager: LabelingSuiteManager;
    private labelingLinkData: LabelingLinkData;

    constructor(baseManager: LabelingSuiteManager, route: ActivatedRoute) {
        this.baseManager = baseManager;
        this.labelingLinkData = this.parseLabelingLinkData(route);
        // UserManager.registerAfterInitActionOrRun(this, this.prepareUserData, true);
    }

    doBeforeDestroy(): void {
        // UserManager.unregisterRoleChangeListener(this);
    }

    //    public assumeUserRole(        userRole: string,        linkType: labelingLinkType      ): string {
    //         if (userRole == 'ANNOTATOR' || userRole == 'EXPERT') return userRole;
    //         switch (linkType) {
    //           case labelingLinkType.DATA_SLICE:
    //             return userRoles.EXPERT;
    //           case labelingLinkType.HEURISTIC:
    //             return userRoles.ANNOTATOR;
    //           case labelingLinkType.SESSION:
    //           default:
    //             return userRoles.ENGINEER;
    //         }
    //       }
    private guessLinkType(userRole: string): string {
        switch (userRole) {
            case UserRole.EXPERT:
                return LabelingLinkType.DATA_SLICE;
            case UserRole.ANNOTATOR:
                return LabelingLinkType.HEURISTIC;
            case UserRole.ENGINEER:
            default:
                return LabelingLinkType.SESSION;
        }
    }
    private linkTypeFromStr(str: string): LabelingLinkType {
        if (!str) return LabelingLinkType.SESSION;
        switch (str.toUpperCase()) {
            case 'DATA_SLICE':
                return LabelingLinkType.DATA_SLICE;
            case 'HEURISTIC':
                return LabelingLinkType.HEURISTIC;
            case 'SESSION':
            default:
                return LabelingLinkType.SESSION;
        }
    }

    private parseLabelingLinkData(route: ActivatedRoute): LabelingLinkData {
        const projectId = route.parent.snapshot.paramMap.get('projectId');
        const id = route.snapshot.paramMap.get('id');
        const requestedPosStr = route.snapshot.queryParamMap.get('pos');
        const isPosNumber = !Number.isNaN(Number(requestedPosStr));
        const type = this.linkTypeFromStr(route.snapshot.queryParamMap.get('type'));

        return {
            projectId: projectId,
            id: id,
            requestedPos: isPosNumber ? Number(requestedPosStr) : 0,
            linkType: type,
        };
    }

    public redirectIfNecessary(): boolean {


        return false;
    }

}