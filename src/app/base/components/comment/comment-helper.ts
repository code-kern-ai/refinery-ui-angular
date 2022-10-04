import { timer } from "rxjs";
import { OrganizationApolloService } from "../../services/organization/organization-apollo.service";
import { UserManager } from 'src/app/util/user-manager';
import { first } from "rxjs/operators";

export class CommentDataManager {


    private static orgApolloService: OrganizationApolloService;
    private static singleTon: CommentDataManager = null;
    private static commentRequests: Map<Object, CommentRequest[]> = new Map<Object, CommentRequest[]>();
    private static requestQueued: boolean = false;
    private static globalProjectId: string = "GLOBAL";
    private data: {};
    private addInfo: {};
    public currentData: {};
    private currentDataRequested: boolean = false;
    public canCommentOnPage: boolean = false;
    private currentCommentTypeOptions: any[];
    private dataRequestWaiting: boolean = false;
    private allUsers: any;
    private addCommentRequests: {} = {};

    //needs to be called once from app (because of the http injection)
    public static initManager(orgApolloService: OrganizationApolloService) {
        CommentDataManager.orgApolloService = orgApolloService;
        CommentDataManager.singleTon = new CommentDataManager();

    }


    public static isInit(): boolean {
        return !!CommentDataManager.singleTon;
    }

    public static getInstance(): CommentDataManager {
        if (!CommentDataManager.isInit()) {
            console.log("CommentDataManager not initialized");
            return null;
        }
        return CommentDataManager.singleTon;
    }

    public static registerCommentRequests(caller: Object, requests: CommentRequest[]) {
        let comments = [...requests];
        if (CommentDataManager.commentRequests.has(caller)) comments.push(...CommentDataManager.commentRequests.get(caller));
        CommentDataManager.commentRequests.set(caller, comments);
        if (CommentDataManager.isInit()) {
            CommentDataManager.singleTon.requestMissingData();
            CommentDataManager.singleTon.buildCommentTypeOptions();
            CommentDataManager.singleTon.checkCanCommentOnPage();
            CommentDataManager.singleTon.parseToCurrentData();
        }
        else CommentDataManager.requestQueued = true;

    }

    public static unregisterAllCommentRequests(caller: Object) {
        if (CommentDataManager.commentRequests.has(caller)) {
            CommentDataManager.commentRequests.delete(caller);
            if (CommentDataManager.isInit()) {
                CommentDataManager.singleTon.checkCanCommentOnPage();
                CommentDataManager.singleTon.parseToCurrentData();
            }
        }

    }

    public static unregisterPartialCommentRequests(caller: Object, requests: CommentRequest[]) {
        if (CommentDataManager.commentRequests.has(caller)) {
            let comments = CommentDataManager.commentRequests.get(caller);
            comments = comments.filter(c => requests.some(a => a.commentType == c.commentType && a.projectId == c.projectId && a.commentKey == c.commentKey));
            CommentDataManager.commentRequests.delete(caller);
            if (CommentDataManager.isInit()) {
                CommentDataManager.singleTon.checkCanCommentOnPage();
                CommentDataManager.singleTon.parseToCurrentData();
            }
            console.log("TODO: untested function!! - unregisterPartialCommentRequests")
        }
    }



    //class methods
    constructor() {
        this.data = {};
        this.addInfo = {};
        UserManager.registerAfterInitActionOrRun(this, () => this.allUsers = UserManager.getAllUsers(false), true);
        if (CommentDataManager.requestQueued) {
            this.requestMissingData(500);
            CommentDataManager.requestQueued = false;
        }
        this.checkCanCommentOnPage();

    }

    private checkCanCommentOnPage() {
        this.canCommentOnPage = CommentDataManager.commentRequests.size > 0;
    }

    private buildCommentTypeOptions() {
        // first as dict to ensure uniqueness
        const dict = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                dict[commentRequest.commentType.toString()] = commentTypeToString(commentRequest.commentType);
            });
        });

        const types = [];

        for (var key in dict) {
            if (dict.hasOwnProperty(key)) {
                types.push({ key: key, name: dict[key] });
            }
        }

        this.currentCommentTypeOptions = types;
    }

    public getCommentTypeOptions(): any[] {
        if (!this.currentCommentTypeOptions) this.buildCommentTypeOptions();
        return this.currentCommentTypeOptions;
    }

    public getCommentIdOptions(key: string): any[] {
        const list = this.addInfo?.[key]
        if (!list) console.log("Can't find addInfo for key", key);
        return list;
    }

    public clearAllData() {
        this.data = {};
    }

    private requestMissingData(wait: number = 0) {
        if (this.dataRequestWaiting) return;
        if (wait) {
            this.dataRequestWaiting = true;
            timer(wait).subscribe(() => this.requestMissingData());
            return;
        }

        //in sub
        const requestJsonString = this.buildRequestJSON();
        if (!requestJsonString) return;
        CommentDataManager.orgApolloService.requestComments(requestJsonString).pipe(first()).subscribe((data) => {
            this.parseCommentData(data);
            this.dataRequestWaiting = false;
            this.parseToCurrentData();
            console.log("comment data", data);
        });
    }

    private parseToCurrentData(isLooped: boolean = false) {
        if (!this.allUsers) {
            if (this.currentDataRequested && !isLooped) return;
            this.currentDataRequested = true;
            timer(250).subscribe(() => this.parseToCurrentData(true));
            return;
        }
        this.currentData = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                if (this.data[commentRequest.commentType]) {
                    const projectId = commentRequest.projectId ? commentRequest.projectId : CommentDataManager.globalProjectId;

                    if (this.data[commentRequest.commentType][projectId]) {
                        if (commentRequest.commentKey && this.data[commentRequest.commentType][projectId][commentRequest.commentKey]) {
                            this.addCommentArrToCurrent(this.data[commentRequest.commentType][projectId][commentRequest.commentKey]);
                        }
                        if (!commentRequest.commentKey) {
                            const keys = Object.keys(this.data[commentRequest.commentType][projectId]);
                            keys.forEach(key => this.addCommentArrToCurrent(this.data[commentRequest.commentType][projectId][key]));
                        }
                    }
                }
            });
        });
        this.extendCurrentDataWithAddInfo();
        this.currentDataRequested = false;
        console.log("current!", this.currentData)
    }
    private addCommentArrToCurrent(arr: any[]) {
        for (const c of arr) this.currentData[c.id] = c;
    }

    private extendCurrentDataWithAddInfo() {
        for (const key in this.currentData) {
            let commentData = this.currentData[key];
            if (!commentData.creationUser) {
                commentData.creationUser = this.getUserNameFromId(commentData.created_by);
            }
            if (!commentData.xfkeyAdd) {
                commentData.xfkeyAdd = this.getAddFromId(commentData.xfkey, commentData.xftype);
            }
            if (!commentData.open) commentData.open = false;
            if (!commentData.edit) commentData.edit = false;
        }
    }

    private getAddFromId(xfkey: string, xftype: string): string {
        if (!this.addInfo) return "";
        const list = this.addInfo[xftype];
        if (!list) return "";
        const item = list.find(i => i.id == xfkey);
        if (!item) return "";
        return commentTypeToString(xftype as CommentType, true) + ": " + item.name;

    }

    private getUserNameFromId(userId: string): string {
        const user = this.allUsers?.find(u => u.id == userId);
        if (!user) return "";
        return user.mail;


    }

    public createComment(commentText: string, commentType: string, commentKey: string, isPrivate: boolean) {
        const projectId = this.getProjectIdFromCommentType(commentType);
        console.log(CommentDataManager.commentRequests)
        CommentDataManager.orgApolloService.createComment(commentText, commentType, commentKey, projectId, isPrivate).pipe(first()).subscribe((data) => {
            console.log("comment created", data);
            if (data?.ok) {
                console.log("TODO:unoptimized request --> add directly or only request nessecary info");
                //append to "add data" to also request new comment (commentrequest type)
                const backRequest: CommentRequest = { commentType: commentType as CommentType, projectId: projectId, commentKey: commentKey };
                const key = commentRequestToKey(backRequest);
                this.addCommentRequests[key] = backRequest;
                this.requestMissingData();
            }

        });
    }

    public deleteComment(commentId: string, projectId: string = null) {
        CommentDataManager.orgApolloService.deleteComment(commentId, projectId).pipe(first()).subscribe((data) => {
            console.log("comment deleted", data);
            if (data?.ok) {
                this.removeCommentFromData(commentId);
                this.parseToCurrentData();
            }
        });
    }
    public updateComment(commentId: string, changesJson: string, projectId: string = null) {
        CommentDataManager.orgApolloService.updateComment(commentId, changesJson, projectId).pipe(first()).subscribe();
    }

    private removeCommentFromData(commentId: string) {
        for (const key in this.data) {
            for (const projectId in this.data[key]) {
                for (const commentKey in this.data[key][projectId]) {
                    const arr = this.data[key][projectId][commentKey];
                    const index = arr.findIndex(c => c.id == commentId);
                    if (index >= 0) arr.splice(index, 1);
                    if (arr.length == 0) delete this.data[key][projectId][commentKey];
                }
                if (Object.keys(this.data[key][projectId]).length == 0) delete this.data[key][projectId];
            }
            if (Object.keys(this.data[key]).length == 0) delete this.data[key];
        }
    }

    private getProjectIdFromCommentType(commentType: string): string {
        //only works if there aren't multiple projects in the reqeusts (need to register & unregister corretly)
        for (const kv of CommentDataManager.commentRequests) {
            for (const comment of kv[1]) {
                if (comment.commentType == commentType) return comment.projectId;
            }
        }

        return null;
    }

    private parseCommentData(data) {
        for (const key in data) {
            if (data[key].add_info) {
                const type = key.split("@")[0];
                if (!this.addInfo[type] && data[key].add_info) this.addInfo[type] = data[key].add_info;
                if (type == "RECORD") {
                    if (!this.addInfo[type]) this.addInfo[type] = [];
                    this.addInfo[type].push('current');
                }
            }
            if (data[key].data) {
                data[key].data.forEach(e => {
                    if (!(e.xftype in this.data)) this.data[e.xftype] = {};
                    const projectId = e.project_id ? e.project_id : CommentDataManager.globalProjectId;
                    if (!(projectId in this.data[e.xftype])) this.data[e.xftype][projectId] = {};
                    if (!(e.xfkey in this.data[e.xftype][projectId])) this.data[e.xftype][projectId][e.xfkey] = [];
                    this.data[e.xftype][projectId][e.xfkey].push(e);

                });
            }
        }
    }

    private buildRequestJSON(): string {
        let requestJSON = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                const key = commentRequestToKey(commentRequest);
                if (!(key in requestJSON) && !this.hasCommentDataAlready(commentRequest)) {

                    requestJSON[key] = { xftype: commentRequest.commentType };
                    if (commentRequest.projectId) requestJSON[key].pId = commentRequest.projectId;
                    if (commentRequest.commentKey) requestJSON[key].xfkey = commentRequest.commentKey;
                    if (!this.addInfo[commentRequest.commentType]) requestJSON[key].includeAddInfo = true;

                }

            });
        });
        for (const key in this.addCommentRequests) {
            if (!(key in requestJSON)) {
                const commentRequest = this.addCommentRequests[key];
                requestJSON[key] = { xftype: commentRequest.commentType };
                if (commentRequest.projectId) requestJSON[key].pId = commentRequest.projectId;
                if (commentRequest.commentKey) requestJSON[key].xfkey = commentRequest.commentKey;
            }
        }
        this.addCommentRequests = {};

        console.log("requestJson", requestJSON);
        if (Object.keys(requestJSON).length == 0) return null;
        return JSON.stringify(requestJSON);
    }
    private hasCommentDataAlready(commentRequest: CommentRequest): boolean {
        if (!(commentRequest.commentType in this.data)) return false;
        const projectId = commentRequest.projectId ? commentRequest.projectId : CommentDataManager.globalProjectId;
        if (!(projectId in this.data[commentRequest.commentType])) return false;
        if (commentRequest.commentKey && !(commentRequest.commentKey in this.data[commentRequest.commentType][projectId])) return false;
        return true;
    }
}



export type CommentRequest = {
    commentType: CommentType;
    projectId?: string;
    commentKey?: string;
};

function commentRequestToKey(cr: CommentRequest) {
    return cr.commentType + "@" + cr.projectId + "@" + cr.commentKey;

}

export enum CommentType {
    LABELING_TASK = "LABELING_TASK",
    RECORD = "RECORD",
    ORGANIZATION = "ORGANIZATION",
    ATTRIBUTE = "ATTRIBUTE",
    USER = "USER"
}

function commentTypeToString(type: CommentType, singular: boolean = false): string {
    switch (type) {
        case CommentType.LABELING_TASK: return "Labeling Task" + (singular ? "" : "s");
        case CommentType.RECORD: return "Record" + (singular ? "" : "s");
        case CommentType.ORGANIZATION: return "Organization" + (singular ? "" : "s");
        case CommentType.ATTRIBUTE: return "Attribute" + (singular ? "" : "s");
        case CommentType.USER: return "User" + (singular ? "" : "s");
    }
    return "Unknown type"
}