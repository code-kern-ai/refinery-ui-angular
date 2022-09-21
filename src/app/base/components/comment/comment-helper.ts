import { timer } from "rxjs";
import { OrganizationApolloService } from "../../services/organization/organization-apollo.service";

export class CommentDataManager {


    private static orgApolloService: OrganizationApolloService;
    private static singleTon: CommentDataManager = null;
    private static commentRequests: Map<Object, CommentRequest[]> = new Map<Object, CommentRequest[]>();
    private static requestQueued: boolean = false;
    public data: {};
    private dataRequestWaiting: boolean = false;

    //needs to be called once from app (because of the http injection)
    public static initManager(orgApolloService: OrganizationApolloService) {
        CommentDataManager.orgApolloService = orgApolloService;
        CommentDataManager.singleTon = new CommentDataManager();
        CommentDataManager.singleTon.data = {};
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
        console.log("work in progress")
        return;
        let comments = [...requests];
        if (CommentDataManager.commentRequests.has(caller)) comments.push(...CommentDataManager.commentRequests.get(caller));
        CommentDataManager.commentRequests.set(caller, comments);
        if (CommentDataManager.isInit()) CommentDataManager.singleTon.requestAllData();
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
    private parseCommentData(data) {
        this.data = {};
        for (const key in data) {
            data[key].data.forEach(e => {
                if (!(e.xftype in this.data)) this.data[e.xftype] = {};
                if (!(e.xfkey in this.data[e.xftype])) this.data[e.xftype][e.xfkey] = [];
                this.data[e.xftype][e.xfkey].push(e);

            });
        }
        console.log("after parse", this.data)
    }

    private buildRequestJSON(): string {
        let requestJSON = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                const key = commentRequest.commentType + "-" + commentRequest.projectId + "-" + commentRequest.commentKey;
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
    commentType: string;
    projectId?: string;
    commentKey?: string;
};
