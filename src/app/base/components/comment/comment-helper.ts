import { timer } from "rxjs";
import { OrganizationApolloService } from "../../services/organization/organization-apollo.service";

export class CommentDataManager {


    private static orgApolloService: OrganizationApolloService;
    private static singleTon: CommentDataManager = null;
    private static commentRequests: Map<Object, CommentRequest[]> = new Map<Object, CommentRequest[]>();
    private static requestQueued: boolean = false;
    public data: {};
    public addInfo: {};
    private currentCommentTypeOptions: any[];
    private dataRequestWaiting: boolean = false;

    //needs to be called once from app (because of the http injection)
    public static initManager(orgApolloService: OrganizationApolloService) {
        CommentDataManager.orgApolloService = orgApolloService;
        CommentDataManager.singleTon = new CommentDataManager();
        CommentDataManager.singleTon.data = {};
        CommentDataManager.singleTon.addInfo = {};
        if (CommentDataManager.requestQueued) {

            CommentDataManager.singleTon.requestAllData(500);
            CommentDataManager.requestQueued = false;
        }
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
            CommentDataManager.singleTon.requestAllData();
            CommentDataManager.singleTon.buildCommentTypeOptions();
        }
        else CommentDataManager.requestQueued = true;


    }

    public static unregisterAllCommentRequests(caller: Object) {
        if (CommentDataManager.commentRequests.has(caller)) {
            CommentDataManager.commentRequests.delete(caller);
        }
    }

    public static unregisterPartialCommentRequests(caller: Object, requests: CommentRequest[]) {
        if (CommentDataManager.commentRequests.has(caller)) {
            let comments = CommentDataManager.commentRequests.get(caller);
            comments = comments.filter(c => requests.some(a => a.commentType == c.commentType && a.projectId == c.projectId && a.commentKey == c.commentKey));
            CommentDataManager.commentRequests.delete(caller);
            //todo test
        }
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
        if (this.currentCommentTypeOptions) this.buildCommentTypeOptions();
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

    public requestAllData(wait: number = 0) {
        if (this.dataRequestWaiting) return;
        if (wait) {
            this.dataRequestWaiting = true;
            timer(wait).subscribe(() => this.requestAllData());
            return;
        }

        //in sub
        CommentDataManager.orgApolloService.requestComments(this.buildRequestJSON()).subscribe((data) => {
            console.log("comment data", data);
            this.parseCommentData(data);
            this.dataRequestWaiting = false;
        });
    }

    public createComment(commentText: string, commentType: string, commentKey: string, isPrivate: boolean) {
        const projectId = this.getProjectIdFromCommentType(commentType);
        console.log(CommentDataManager.commentRequests)
        CommentDataManager.orgApolloService.createComment(commentText, commentType, commentKey, projectId, isPrivate).subscribe((data) => {
            console.log("comment created", data);
            if (data?.ok) {

            }
            //unoptimized request --> add directly or only request nessecary info
            this.requestAllData();
        });
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
        this.data = {};
        for (const key in data) {
            if (data[key].add_info) {
                const type = key.split("@")[0];
                if (!this.addInfo[type]) this.addInfo[type] = data[key].add_info;
                if (type == "RECORD") {
                    if (!this.addInfo[type]) this.addInfo[type] = [];
                    this.addInfo[type].push('current');
                }
            }
            if (data[key].data) {
                data[key].data.forEach(e => {
                    if (!(e.xftype in this.data)) this.data[e.xftype] = {};
                    if (!(e.xfkey in this.data[e.xftype])) this.data[e.xftype][e.xfkey] = [];
                    this.data[e.xftype][e.xfkey].push(e);

                });
            }
        }
        console.log("after parse", this.data, this.addInfo)
    }

    private buildRequestJSON(): string {
        let requestJSON = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                const key = commentRequest.commentType + "@" + commentRequest.projectId + "@" + commentRequest.commentKey;
                if (!(key in requestJSON)) {

                    requestJSON[key] = { xftype: commentRequest.commentType };
                    if (commentRequest.projectId) requestJSON[key].pId = commentRequest.projectId;
                    if (commentRequest.commentKey) requestJSON[key].xfkey = commentRequest.commentKey;
                }

            });
        });
        console.log("requestJson", requestJSON);
        return JSON.stringify(requestJSON);
    }

}



export type CommentRequest = {
    commentType: CommentType;
    projectId?: string;
    commentKey?: string;
};

export enum CommentType {
    LABELING_TASK = "LABELING_TASK",
    RECORD = "RECORD",
    ORGANIZATION = "ORGANIZATION",
    ATTRIBUTE = "ATTRIBUTE",
    USER = "USER"
}

function commentTypeToString(type: CommentType): string {
    switch (type) {
        case CommentType.LABELING_TASK: return "Labeling Task";
        case CommentType.RECORD: return "Record";
        case CommentType.ORGANIZATION: return "Organization";
        case CommentType.ATTRIBUTE: return "Attribute";
        case CommentType.USER: return "User";
    }
    return "Unknown type"
}