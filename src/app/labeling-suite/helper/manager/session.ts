import { ActivatedRoute, Router } from "@angular/router";
import { forkJoin, Observable, timer } from "rxjs";
import { first } from "rxjs/operators";
import { UserRole } from "src/app/base/enum/graphql-enums";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { parseLinkFromText } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { RouteManager } from "src/app/util/route-manager";
import { UserManager } from "src/app/util/user-manager";
import { LabelingSuiteManager } from "./manager";
import { dateAsUTCDate } from "submodules/javascript-functions/date-parser";


export type LabelingLinkData = {
    projectId: string;
    huddleId: string;
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
const ONE_DAY = 86400000; // 24 * 60 * 60 * 1000;
const DUMMY_HUDDLE_ID = "00000000-0000-0000-0000-000000000000";

export function parseLabelingLinkData(route: ActivatedRoute): LabelingLinkData {
    const projectId = route.parent.snapshot.paramMap.get('projectId');
    const id = route.snapshot.paramMap.get('id');
    const requestedPosStr = route.snapshot.queryParamMap.get('pos');
    const isPosNumber = !Number.isNaN(Number(requestedPosStr));
    const type = linkTypeFromStr(route.snapshot.queryParamMap.get('type'));

    return {
        projectId: projectId,
        huddleId: id,
        requestedPos: isPosNumber ? Number(requestedPosStr) : 0,
        linkType: type,
    };
}

function linkTypeFromStr(str: string): LabelingLinkType {
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

export class LabelingSuiteSessionManager implements DoBeforeDestroy {

    private labelingLinkData: LabelingLinkData;
    private huddleData: LabelingHuddle;
    public availableLinks: any[];
    public availableLinksLookup: {};
    public selectedLink: any;
    public absoluteWarning: string;
    private debounceTimer: any;

    public nextDisabled: boolean = true;
    public prevDisabled: boolean = true;
    public positionString: string = "/ records in";
    public redirected: boolean = false;

    constructor(
        private baseManager: LabelingSuiteManager,
        private activeRoute: ActivatedRoute,
        private router: Router,
        private projectApolloService: ProjectApolloService,) {

        this.baseManager = baseManager;
        this.labelingLinkData = parseLabelingLinkData(activeRoute);
        this.redirected = this.redirectIfNecessary();
        if (this.redirected) return;
        UserManager.assumeUserRole(this.guessRoleFromLinkType(this.labelingLinkData.linkType));

        this.readHuddleDataFromLocal();

        NotificationService.subscribeToNotification(this, {
            projectId: this.baseManager.projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });
    }

    doBeforeDestroy(): void {
        if (this.baseManager.userManager.roleAssumed) localStorage.removeItem("huddleData");
        NotificationService.unsubscribeFromNotification(this, this.baseManager.projectId);
    }

    private getWebsocketWhitelist(): string[] {
        let toReturn = ['access_link_changed', 'access_link_removed'];
        return toReturn;
    }

    private handleWebsocketNotification(msgParts: string[]) {
        if (['access_link_changed', 'access_link_removed'].includes(msgParts[1])) {
            if (this.router.url.indexOf(msgParts[3]) > -1 && this.labelingLinkData) {
                //python "True" string
                this.labelingLinkData.linkLocked = !msgParts[4] || msgParts[4] === 'True';
                location.reload();
            }
        }
    }

    public getAllowedTaskId(): string {
        return this.huddleData?.allowedTask;
    }

    public setCurrentRecordDeleted() {

        this.huddleData.recordIds[this.huddleData.linkData.requestedPos - 1] = "deleted";
        this.jumpToPosition(this.baseManager.projectId, this.huddleData.linkData.requestedPos);
    }

    public prepareLabelingSession() {
        this.prepareLabelingSessionInternal(this.labelingLinkData.huddleId, this.labelingLinkData.requestedPos);
    }

    private prepareLabelingSessionInternal(huddleId: string, pos: number) {
        const projectId = this.baseManager.projectId;
        //default handling
        if (pos == null && this.huddleData?.linkData.requestedPos) pos = this.huddleData.linkData.requestedPos;
        if (pos == null) pos = 0;
        if (huddleId == DUMMY_HUDDLE_ID && this.huddleData?.linkData.huddleId) huddleId = this.huddleData.linkData.huddleId;

        //request preparation
        if (!this.huddleData || this.huddleData.linkData.huddleId != huddleId || this.huddleData.linkData.projectId != projectId) {
            // no/old session data --> refetch
            this.huddleData = null;
            localStorage.removeItem("huddleData");
            this.requestHuddleData(projectId, huddleId);

        } else if (this.huddleData.partial) {
            //collect remaining
            this.requestHuddleData(projectId, huddleId);
        }
        if (this.huddleData) this.jumpToPosition(projectId, pos);
    }

    private requestHuddleData(projectId: string, huddleId: string) {
        if (huddleId != this.labelingLinkData.huddleId) {
            console.log("something wrong with session/huddle integration");
            return
        }
        this.projectApolloService.requestHuddleData(projectId, this.labelingLinkData.huddleId, this.labelingLinkData.linkType)
            .pipe(first()).subscribe((huddleData) => {
                if (!this.stillInLabeling()) return;
                if (huddleId == DUMMY_HUDDLE_ID) {
                    this.labelingLinkData.huddleId = huddleData.huddleId;
                    this.collectAvailableLinks();
                }
                if (!huddleData.huddleId) {
                    //nothing was found (no slice / heuristic available)        
                    this.baseManager.somethingLoading = false;
                    if (this.labelingLinkData) this.changeLinkLockState(true);
                    return;
                }
                if (huddleData.startPos != -1) this.labelingLinkData.requestedPos = huddleData.startPos;
                this.huddleData = {
                    recordIds: huddleData.recordIds ? huddleData.recordIds as string[] : [],
                    partial: false,
                    linkData: this.labelingLinkData,
                    allowedTask: huddleData.allowedTask,
                    canEdit: huddleData.canEdit,
                    checkedAt: this.parseCheckedAt(huddleData.checkedAt)
                }

                localStorage.setItem('huddleData', JSON.stringify(this.huddleData));
                let pos = this.labelingLinkData.requestedPos;
                if (huddleData.startPos != -1) pos++; //zero based in backend
                this.jumpToPosition(projectId, pos);
            });
    }

    private changeLinkLockState(state: boolean) {
        if (!this.labelingLinkData) return;
        this.labelingLinkData.linkLocked = state;
        this.absoluteWarning = state ? 'his link is locked, contact your supervisor to request access' : null;
        this.baseManager.checkAbsoluteWarning();
    }

    public jumpToPosition(projectId: string, pos: number) {
        if (!this.huddleData || !this.huddleData.recordIds) return;
        if (pos % 1 != 0) pos = parseInt("" + pos);
        let jumpPos = String(pos).length == 0 ? 1 : pos;
        if (jumpPos <= 0) jumpPos = 1;
        else if (jumpPos > this.huddleData.recordIds.length) jumpPos = this.huddleData.recordIds.length;

        this.huddleData.linkData.requestedPos = jumpPos;
        localStorage.setItem('huddleData', JSON.stringify(this.huddleData));

        //ensure address matches request
        this.router.navigate(["../" + projectId + "/labeling/" + this.huddleData.linkData.huddleId],
            { relativeTo: this.activeRoute.parent, queryParams: { pos: jumpPos, type: this.huddleData.linkData.linkType } });

        if (this.debounceTimer) this.debounceTimer.unsubscribe();
        const jumpIdx = jumpPos - 1;
        this.debounceTimer = timer(200).subscribe(() => this.baseManager.recordManager.collectRecordData(this.huddleData.recordIds[jumpIdx]));
        this.nextDisabled = !this.huddleData || jumpPos == this.huddleData.recordIds.length;
        this.prevDisabled = !this.huddleData || jumpIdx == 0;
        this.positionString = jumpPos + " / " + this.huddleData.recordIds.length + " records in";
    }


    private parseCheckedAt(checkedAt: string): { local: Date, db: Date } {
        return {
            local: dateAsUTCDate(new Date(checkedAt)),
            db: new Date(checkedAt)
        }
    }

    public setupInitialTasks() {
        const initialTasks$ = [];
        if (this.huddleData?.checkedAt.db) {
            initialTasks$.push(this.checkLocalDataOutdated());
        }
        if (this.labelingLinkData.linkType == LabelingLinkType.HEURISTIC) {
            initialTasks$.push(this.checkLinkAccess());
        }
        if (initialTasks$.length > 0) {
            forkJoin(initialTasks$).pipe(first()).subscribe(() => this.continueSetup());
        } else {
            this.continueSetup();
        }
    }
    public nextRecord() {
        this.huddleData.linkData.requestedPos++;
        this.jumpToPosition(this.baseManager.projectId, this.huddleData.linkData.requestedPos);
    }
    public previousRecord() {
        this.huddleData.linkData.requestedPos--;
        this.jumpToPosition(this.baseManager.projectId, this.huddleData.linkData.requestedPos);
    }

    public goToRecordIde() {
        const sessionId = this.labelingLinkData.huddleId;
        const pos = this.labelingLinkData.requestedPos;

        this.router.navigate(["projects", this.baseManager.projectId, "record-ide", sessionId], { queryParams: { pos: pos } });
    }
    public getSourceId(): string {
        if (!this.huddleData) return null;
        if (this.huddleData.linkData.linkType != LabelingLinkType.HEURISTIC) return null;
        return this.huddleData.linkData.huddleId;
    }

    public dropdownSelectLink(linkId: string) {
        if (linkId == this.selectedLink?.id) return;
        this.selectedLink = this.availableLinksLookup[linkId];
        if (!this.selectedLink) return;
        const linkData = parseLinkFromText(this.selectedLink.link);
        this.router.navigate([linkData.route], { queryParams: linkData.queryParams });
        timer(200).subscribe(() => location.reload());
    }


    private continueSetup() {
        this.collectAvailableLinks();
        if (this.labelingLinkData.linkLocked) return;
        this.baseManager.setupAfterSessionInit();
    }

    private collectAvailableLinks() {
        if (this.baseManager.userManager.currentRole == UserRole.ENGINEER) return;
        const heuristicId = this.labelingLinkData.linkType == LabelingLinkType.HEURISTIC ? this.labelingLinkData.huddleId : null;
        const assumedRole = this.baseManager.userManager.roleAssumed ? this.baseManager.userManager.currentRole : null
        this.projectApolloService.availableLabelingLinks(this.labelingLinkData.projectId, assumedRole, heuristicId)
            .pipe(first()).subscribe((availableLinks) => {
                if (!this.stillInLabeling()) return;
                this.availableLinks = availableLinks;
                this.availableLinksLookup = {};
                this.availableLinks.forEach(link => this.availableLinksLookup[link.id] = link);
                const linkRoute = this.router.url.split("?")[0];
                this.selectedLink = this.availableLinks.find(link => link.link.split("?")[0] == linkRoute);
            });
    }

    private stillInLabeling(): boolean {
        if (!RouteManager.currentUrl) return true;
        return RouteManager.currentUrl.includes("labeling");
    }

    private checkLocalDataOutdated(): Observable<any> {
        const dbTime = this.huddleData.checkedAt.db;
        const pipeFirst = this.projectApolloService.linkDataOutdated(this.labelingLinkData.projectId, this.router.url, dbTime)
            .pipe(first());

        pipeFirst.subscribe((outdated) => {
            if (outdated) {
                localStorage.removeItem("huddleData");
                this.huddleData = null;
            }
        });
        return pipeFirst;
    }

    private checkLinkAccess(): Observable<any> {
        const pipeFirst = this.projectApolloService.linkLocked(this.labelingLinkData.projectId, this.router.url)
            .pipe(first());

        pipeFirst.subscribe((isLocked) => {
            this.changeLinkLockState(isLocked);
            if (isLocked) this.baseManager.somethingLoading = false;
        });
        return pipeFirst;
    }


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

    private guessRoleFromLinkType(linkType: LabelingLinkType): UserRole {
        switch (linkType) {
            case LabelingLinkType.DATA_SLICE:
                return UserRole.EXPERT;
            case LabelingLinkType.HEURISTIC:
                return UserRole.ANNOTATOR;
            case LabelingLinkType.SESSION:
            default:
                return UserRole.ENGINEER;
        }
    }


    private redirectIfNecessary(): boolean {
        if (!this.labelingLinkData.huddleId) {
            const currentUserRole = this.baseManager.userManager.mainUser.data.role;
            const type = this.guessLinkType(currentUserRole);
            this.router.navigate([DUMMY_HUDDLE_ID], { relativeTo: this.activeRoute, queryParams: { pos: 0, type: type }, });
            return true;
        }

        return false;
    }


    private readHuddleDataFromLocal() {
        this.huddleData = JSON.parse(localStorage.getItem("huddleData"));
        if (!this.huddleData) return;
        if (typeof this.huddleData.checkedAt.db == 'string') {
            this.huddleData.checkedAt.db = new Date(this.huddleData.checkedAt.db);
        }
        if (typeof this.huddleData.checkedAt.local == 'string') {
            this.huddleData.checkedAt.local = new Date(this.huddleData.checkedAt.local);
        }
        if (this.huddleData.linkData.requestedPos != this.labelingLinkData.requestedPos) {
            //url manual changed
            this.huddleData.linkData.requestedPos = this.labelingLinkData.requestedPos;
        }
        if (this.huddleOutdated()) {
            localStorage.removeItem("huddleData");
            this.huddleData = null;
        }
    }

    private huddleOutdated(): boolean {
        if (!this.huddleData) return true;
        for (const key in this.labelingLinkData) {
            if (key == 'linkLocked') continue;
            if (this.labelingLinkData[key] != this.huddleData.linkData[key]) return true;
        }
        if (this.huddleData.checkedAt?.local) {
            if ((new Date().getTime() - this.huddleData.checkedAt.local.getTime()) > ONE_DAY) return true;
        }
        return false;
    }


}