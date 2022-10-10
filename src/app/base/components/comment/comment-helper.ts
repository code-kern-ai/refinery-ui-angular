import { timer } from "rxjs";
import { OrganizationApolloService } from "../../services/organization/organization-apollo.service";
import { UserManager } from 'src/app/util/user-manager';
import { first } from "rxjs/operators";
import { NotificationService } from "../../services/notification.service";

export class CommentDataManager {


    private static orgApolloService: OrganizationApolloService;
    private static singleTon: CommentDataManager = null;
    private static commentRequests: Map<Object, CommentRequest[]> = new Map<Object, CommentRequest[]>();
    private static requestQueued: boolean = false;
    private static globalProjectId: string = "GLOBAL";
    private data: {};
    private addInfo: {};
    public currentData: {};
    public currentDataOrder: { key: string, commentType: CommentType, commentKeyName: string, commentOrderKey: number }[];
    private currentDataRequested: boolean = false;
    public canCommentOnPage: boolean = false;
    public currentCommentTypeOptions: any[];
    private dataRequestWaiting: boolean = false;
    private allUsers: any;
    private addCommentRequests: {} = {};
    private updateCommentModule: () => void;

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
            CommentDataManager.singleTon.requestMissingData(200);
            CommentDataManager.singleTon.buildCommentTypeOptions();
            CommentDataManager.singleTon.checkCanCommentOnPage();
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
            comments = comments.filter(c => !requests.some(a => a.commentType == c.commentType && a.projectId == c.projectId && a.commentKey == c.commentKey));
            CommentDataManager.commentRequests.set(caller, comments);
            if (CommentDataManager.isInit()) {
                CommentDataManager.singleTon.checkCanCommentOnPage();
                CommentDataManager.singleTon.parseToCurrentData();
            }
        }
    }

    public static unregisterSingleCommentRequests(caller: Object, request: CommentRequest) {
        if (CommentDataManager.commentRequests.has(caller)) {
            let comments = CommentDataManager.commentRequests.get(caller);
            comments = comments.filter(c => request.commentType != c.commentType && request.projectId != c.projectId && request.commentKey != c.commentKey);
            CommentDataManager.commentRequests.set(caller, comments);
            if (CommentDataManager.isInit()) {
                CommentDataManager.singleTon.checkCanCommentOnPage();
                CommentDataManager.singleTon.parseToCurrentData();
            }
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

        NotificationService.subscribeToNotification(this, {
            whitelist: this.getWhiteListNotificationService(true),
            func: this.handleWebsocketNotificationGlobal
        });
        CommentDataManager.orgApolloService.allProjectIds().pipe(first())
            .subscribe((prjIds: any[]) => prjIds.forEach(idObj => this.subScribeToProjectNotifications(idObj.id)));

    }
    public registerUpdateCommentModule(func: () => void) {
        this.updateCommentModule = func;
    }

    private getWhiteListNotificationService(forGlobal: boolean): string[] {
        let toReturn = [];
        if (forGlobal) {
            toReturn.push(...['comment_created', 'comment_updated', 'comment_deleted']);
            toReturn.push(...['project_created', 'project_deleted']);
        } else {
            toReturn.push(...['label_created', 'label_deleted']);
            toReturn.push(...['attributes_updated', 'calculate_attribute']);
            toReturn.push(...['embedding_deleted', 'embedding']);
            toReturn.push(...['labeling_task_updated', 'labeling_task_deleted', 'labeling_task_created']);
            toReturn.push(...['data_slice_created', 'data_slice_updated', 'data_slice_deleted']);
            toReturn.push(...['information_source_created', 'information_source_updated', 'information_source_deleted']);
            toReturn.push(...['knowledge_base_created', 'knowledge_base_updated', 'knowledge_base_deleted']);
        }

        return toReturn;
    }


    private handleWebsocketNotificationGlobal(msgParts: string[]) {
        //messages will be GLOBAL:{messageType}:{projectId}:{additionalInfo}
        let somethingToRerequest = false;
        if (msgParts[1] == "comment_deleted") {
            somethingToRerequest = this.removeCommentFromCache(msgParts[3]);

        } else if (msgParts[1] == "comment_updated") {
            somethingToRerequest = this.removeCommentFromCache(msgParts[3]);
            somethingToRerequest = somethingToRerequest || this.isCommentUpdateInterestingForMe(msgParts);
            if (somethingToRerequest) {
                //create helper addon
                const backRequest: CommentRequest = { commentType: msgParts[4] as CommentType, projectId: msgParts[2], commentKey: msgParts[5], commentId: msgParts[3] };
                const key = commentRequestToKey(backRequest);
                this.addCommentRequests[key] = backRequest;
            }
        } else if (msgParts[1] == "comment_created") {
            somethingToRerequest = true;
            //create helper addon
            const backRequest: CommentRequest = { commentType: msgParts[3] as CommentType, projectId: msgParts[2], commentKey: msgParts[4], commentId: msgParts[5] };
            const key = commentRequestToKey(backRequest);
            this.addCommentRequests[key] = backRequest;

        } else if (msgParts[1] == 'project_created') {
            this.subScribeToProjectNotifications(msgParts[2]);
        } else if (msgParts[1] == 'project_deleted') {
            this.unsubScribeFromProjectNotifications(msgParts[2]);
        }

        if (somethingToRerequest) this.requestMissingData(200);
    }
    private handleWebsocketNotificationProject(msgParts: string[]) {
        //messages will be {project_id}:{messageType}:{additionalInfo}
        let somethingToRerequest = false;
        if (['label_created', 'label_deleted'].includes(msgParts[1])) {
            somethingToRerequest = this.modifyCacheFor(CommentType.LABEL, msgParts[0], msgParts[2], msgParts[1] == 'label_created');
        } else if (msgParts[1] == 'attributes_updated') {
            somethingToRerequest = this.modifyCacheFor(CommentType.ATTRIBUTE, msgParts[0], null, true);
        } else if (msgParts[1] == 'calculate_attribute') {
            somethingToRerequest = this.modifyCacheFor(CommentType.ATTRIBUTE, msgParts[0], msgParts[3], msgParts[2] == 'created');
        } else if (msgParts[1] == 'embedding_deleted') {
            somethingToRerequest = this.modifyCacheFor(CommentType.EMBEDDING, msgParts[0], msgParts[2], false);
        } else if (msgParts[1] == 'embedding' && msgParts[3] == 'state' && msgParts[4] == 'INITIALIZING') {
            somethingToRerequest = this.modifyCacheFor(CommentType.EMBEDDING, msgParts[0], msgParts[2], true);
        } else if (['labeling_task_updated', 'labeling_task_deleted', 'labeling_task_created'].includes(msgParts[1])) {
            somethingToRerequest = this.modifyCacheFor(CommentType.LABELING_TASK, msgParts[0], msgParts[2], msgParts[1] != 'labeling_task_deleted');
        } else if (['data_slice_created', 'data_slice_updated', 'data_slice_deleted'].includes(msgParts[1])) {
            somethingToRerequest = this.modifyCacheFor(CommentType.DATA_SLICE, msgParts[0], msgParts[2], msgParts[1] != 'data_slice_deleted');
        } else if (['information_source_created', 'information_source_updated', 'information_source_deleted'].includes(msgParts[1])) {
            somethingToRerequest = this.modifyCacheFor(CommentType.HEURISTIC, msgParts[0], msgParts[2] == "all" ? null : msgParts[2], msgParts[1] != 'information_source_deleted');
        } else if (['knowledge_base_created', 'knowledge_base_updated', 'knowledge_base_deleted'].includes(msgParts[1])) {
            somethingToRerequest = this.modifyCacheFor(CommentType.KNOWLEDGE_BASE, msgParts[0], msgParts[2], msgParts[1] != 'knowledge_base_deleted');
        }

        if (somethingToRerequest) this.requestMissingData(200);
    }

    private isCommentUpdateInterestingForMe(msgParts: string[]): boolean {
        const commentType = msgParts[4] as CommentType;
        const projectId = msgParts[2];
        const interestingForMe = !!this.data[commentType]?.[projectId];
        return interestingForMe;
    }

    private modifyCacheFor(commentType: string, projectId: string, xfkey: string, reReQuest: boolean): boolean {
        const addInfoKey = commentType + "@" + projectId;
        if (addInfoKey in this.addInfo) {
            if (reReQuest) {
                let backRequest: CommentRequest;
                if (xfkey) {
                    const item = this.addInfo[addInfoKey].values.find(v => v.id == xfkey);
                    if (item) item.markedForDeletion = true;
                    backRequest = { commentType: commentType as CommentType, projectId: projectId, commentKey: xfkey };
                } else {
                    this.addInfo[addInfoKey].values.forEach(v => v.markedForDeletion = true);
                    backRequest = { commentType: commentType as CommentType, projectId: projectId };
                }
                const key = commentRequestToKey(backRequest);
                this.addCommentRequests[key] = backRequest;
            } else {
                if (xfkey) {
                    const arr = this.addInfo[addInfoKey].values
                    const index = arr.findIndex(c => c.id == xfkey);
                    if (index >= 0) {
                        arr.splice(index, 1);
                        if (this.updateCommentModule) this.updateCommentModule();
                    }
                } else {
                    this.addInfo[addInfoKey].values = [];
                    if (this.updateCommentModule) this.updateCommentModule();
                }
                //no need to refetch since everything is up to date with the delete 
                return false;
            }
            return true;
        }
        return false;
    }

    private subScribeToProjectNotifications(projectId: string) {
        NotificationService.subscribeToNotification(this, {
            projectId: projectId,
            whitelist: this.getWhiteListNotificationService(false),
            func: this.handleWebsocketNotificationProject
        });

    }
    private unsubScribeFromProjectNotifications(projectId: string) {
        NotificationService.unsubscribeFromNotification(this, projectId);
    }


    private removeCommentFromCache(commentId: string): boolean {
        return this.removeCommentFromData(commentId, true);
    }

    private checkCanCommentOnPage() {
        this.canCommentOnPage = CommentDataManager.commentRequests.size > 0;
    }

    private buildCommentTypeOptions() {
        // first as dict to ensure uniqueness
        const dict = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                dict[commentRequest.commentType.toString()] = { name: commentTypeToString(commentRequest.commentType), order: commentTypeOrder(commentRequest.commentType) };
            });
        });

        const types = [];

        for (var key in dict) {
            if (dict.hasOwnProperty(key)) {
                types.push({ key: key, name: dict[key].name, order: dict[key].order });
            }
        }
        types.sort((a, b) => a.order - b.order);
        this.currentCommentTypeOptions = types;
    }

    public getCommentKeyOptions(key: string): any[] {
        let projectId = this.getProjectIdFromCommentType(key);
        key += "@" + projectId;
        const list = this.addInfo?.[key]?.values
        if (!list) console.log("Can't find addInfo for key", key);
        return list;
    }

    private requestMissingData(wait: number = 0) {
        if (this.dataRequestWaiting) return;
        if (wait) {
            this.dataRequestWaiting = true;
            timer(wait).subscribe(() => {
                this.dataRequestWaiting = false;
                this.requestMissingData();
            });
            return;
        }

        //in sub
        const requestJsonString = this.buildRequestJSON();
        if (!requestJsonString) {
            this.removeCommentsFlaggedForDeletion();
            this.parseToCurrentData();
            return;
        }
        CommentDataManager.orgApolloService.requestComments(requestJsonString).pipe(first()).subscribe((data) => {
            this.parseCommentData(data);
            this.parseToCurrentData();
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
        this.buildCurrentDataOrder();
        this.currentDataRequested = false;
    }

    private buildCurrentDataOrder() {
        this.currentDataOrder = [];
        for (var key in this.currentData) {
            const e = { key: key, commentType: this.currentData[key].xftype, commentKeyName: this.currentData[key].xfkeyAddName, commentOrderKey: this.currentData[key].order_key };
            this.currentDataOrder.push(e);
        }
        this.currentDataOrder.sort((a, b) =>
            commentTypeOrder(a.commentType) - commentTypeOrder(b.commentType) ||
            a.commentKeyName.localeCompare(b.commentKeyName) ||
            a.commentOrderKey - b.commentOrderKey);
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
                commentData.xfkeyAddName = this.getAddFromId(commentData.xfkey, commentData.xftype, commentData.project_id);
                commentData.xfkeyAdd = commentTypeToString(commentData.xftype as CommentType, true) + ": " + commentData.xfkeyAddName;
            }
            if (!commentData.open) commentData.open = false;
            if (!commentData.edit) commentData.edit = false;
        }
    }

    private getAddFromId(xfkey: string, xftype: string, projectId: string): string {
        if (!this.addInfo) return "";
        if (!projectId) projectId = CommentDataManager.globalProjectId;
        const addInfoKey = xftype + "@" + projectId;
        const list = this.addInfo[addInfoKey].values;
        if (!list) return "";
        const item = list.find(i => i.id == xfkey);
        if (!item) return "";
        return item.name;

    }

    private getUserNameFromId(userId: string): string {
        const user = this.allUsers?.find(u => u.id == userId);
        if (!user || !user.mail) return "Unknown user ID";
        return user.mail;
    }

    public createComment(commentText: string, commentType: string, commentKey: string, isPrivate: boolean) {
        const projectId = this.getProjectIdFromCommentType(commentType);
        CommentDataManager.orgApolloService.createComment(commentText, commentType, commentKey, projectId, isPrivate).pipe(first()).subscribe();
    }

    public deleteComment(commentId: string, projectId: string = null) {
        CommentDataManager.orgApolloService.deleteComment(commentId, projectId).pipe(first()).subscribe((data) => {
            if (data?.ok) {
                this.removeCommentFromData(commentId);
                this.parseToCurrentData();
            }
        });
    }
    public updateComment(commentId: string, changesJson: string, projectId: string = null) {
        CommentDataManager.orgApolloService.updateComment(commentId, changesJson, projectId).pipe(first()).subscribe();
    }

    private removeCommentFromData(commentId: string, onlyFlag: boolean = false): boolean {
        let removedSomething = false;
        let markedSomething = false;
        for (const key in this.data) {
            for (const projectId in this.data[key]) {
                for (const commentKey in this.data[key][projectId]) {
                    const arr = this.data[key][projectId][commentKey];
                    const index = arr.findIndex(c => c.id == commentId);
                    if (onlyFlag && index >= 0) {
                        arr[index].markedForDeletion = true;
                        markedSomething = true;
                    } else {
                        if (index >= 0) {
                            arr.splice(index, 1);
                            removedSomething = true;
                        }
                        if (removedSomething && arr.length == 0) delete this.data[key][projectId][commentKey];
                    }
                }
                if (removedSomething && Object.keys(this.data[key][projectId]).length == 0) delete this.data[key][projectId];
            }
            if (removedSomething && Object.keys(this.data[key]).length == 0) delete this.data[key];
        }
        return removedSomething || markedSomething;
    }
    private removeCommentsFlaggedForDeletion() {
        let removedSomething = false;
        for (const key in this.data) {
            for (const projectId in this.data[key]) {
                for (const commentKey in this.data[key][projectId]) {
                    const arr = this.data[key][projectId][commentKey];
                    const index = arr.findIndex(c => c.markedForDeletion);
                    if (index >= 0) {
                        this.data[key][projectId][commentKey] = arr.filter(c => !c.markedForDeletion);
                        removedSomething = true;
                        if (removedSomething && this.data[key][projectId][commentKey] == 0) delete this.data[key][projectId][commentKey];
                    }
                }
                if (removedSomething && Object.keys(this.data[key][projectId]).length == 0) delete this.data[key][projectId];
            }
            if (removedSomething && Object.keys(this.data[key]).length == 0) delete this.data[key];
        }
        for (const key in this.addInfo) {
            const arr = this.addInfo[key].values;
            const index = arr.findIndex(c => c.markedForDeletion);
            if (index >= 0) {
                this.addInfo[key].values = arr.filter(c => !c.markedForDeletion);
            }
        }
    }

    private getProjectIdFromCommentType(commentType: string): string {
        //only works if there aren't multiple projects in the reqeusts (need to register & unregister corretly)
        for (const kv of CommentDataManager.commentRequests) {
            for (const comment of kv[1]) {
                if (comment.commentType == commentType) return comment.projectId;
            }
        }

        return CommentDataManager.globalProjectId;
    }

    private parseCommentData(data) {
        //only remove flagged data once the new data is there to prevent flickering
        this.removeCommentsFlaggedForDeletion();
        for (const key in data) {
            const keyParts = this.parseKey(key);
            // add structure
            if (!(keyParts.commentType in this.data)) this.data[keyParts.commentType] = {};
            const projectId = keyParts.projectId ? keyParts.projectId : CommentDataManager.globalProjectId;
            if (!(projectId in this.data[keyParts.commentType])) this.data[keyParts.commentType][projectId] = {};
            if (keyParts.commentKey && !(keyParts.commentKey in this.data[keyParts.commentType][projectId])) {
                this.data[keyParts.commentType][projectId][keyParts.commentKey] = [];
            }
            // add data to structure
            if (data[key].add_info) {
                const addInfoKey = keyParts.commentType + "@" + projectId;
                if (!this.addInfo[addInfoKey]) this.addInfo[addInfoKey] = { values: data[key].add_info };
                else {
                    for (const addInfo of data[key].add_info) {
                        if (!this.addInfo[addInfoKey].values.find(i => i.id == addInfo.id)) this.addInfo[addInfoKey].values.push(addInfo);
                    }
                }
            }
            if (data[key].data) {
                data[key].data.forEach(e => {
                    if (!(e.xfkey in this.data[e.xftype][projectId])) this.data[e.xftype][projectId][e.xfkey] = [];
                    if (!this.data[e.xftype][projectId][e.xfkey].find(c => c.id == e.id)) this.data[e.xftype][projectId][e.xfkey].push(e);
                });
            }
        }

        if (this.updateCommentModule) this.updateCommentModule();

    }

    private parseKey(key: string): CommentRequest {
        const parts = key.split("@");
        const toReturn = { commentType: parts[0] as CommentType, projectId: parts[1], commentKey: parts[2] };
        if (toReturn.projectId == 'undefined') delete toReturn.projectId;
        if (toReturn.commentKey == 'undefined') delete toReturn.commentKey;

        return toReturn;
    }

    private buildRequestJSON(): string {
        let requestJSON = {};
        CommentDataManager.commentRequests.forEach((value, key) => {
            value.forEach((commentRequest) => {
                const key = commentRequestToKey(commentRequest);
                if (!(key in requestJSON) && !this.hasCommentDataAlready(commentRequest)) {
                    requestJSON[key] = this.buildJsonEntryFromCommentRequest(commentRequest);
                }
            });
        });
        for (const key in this.addCommentRequests) {
            if (!(key in requestJSON)) {
                const commentRequest = this.addCommentRequests[key];
                requestJSON[key] = this.buildJsonEntryFromCommentRequest(commentRequest);
            }
        }
        this.addCommentRequests = {};
        if (Object.keys(requestJSON).length == 0) return null;
        return JSON.stringify(requestJSON);
    }
    private buildJsonEntryFromCommentRequest(commentRequest: CommentRequest) {
        const entry: any = { xftype: commentRequest.commentType };
        if (commentRequest.projectId) entry.pId = commentRequest.projectId;
        if (commentRequest.commentKey) entry.xfkey = commentRequest.commentKey;
        if (commentRequest.commentId) entry.commentId = commentRequest.commentId;
        if (this.shouldRequestAddInfo(commentRequest)) entry.includeAddInfo = true;
        return entry;
    }

    private shouldRequestAddInfo(commentRequest: CommentRequest): boolean {
        const projectId = commentRequest.projectId ? commentRequest.projectId : CommentDataManager.globalProjectId;
        const addInfoKey = commentRequest.commentType + "@" + projectId;
        if (!this.addInfo[addInfoKey] || commentRequest.commentType == CommentType.RECORD) return true;
        if (this.addInfo[addInfoKey]) {
            const arr = this.addInfo[addInfoKey].values
            let index = arr.findIndex(c => c.markedForDeletion);
            if (index >= 0) return true;
            if (commentRequest.commentKey) {
                index = arr.findIndex(c => c.id == commentRequest.commentKey);
                if (index == -1) return true;
            }

        }

        return false;
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
    commentId?: string;
};

function commentRequestToKey(cr: CommentRequest) {
    return cr.commentType + "@" + cr.projectId + "@" + cr.commentKey;

}

export enum CommentType {
    LABELING_TASK = "LABELING_TASK",
    RECORD = "RECORD",
    ORGANIZATION = "ORGANIZATION",
    ATTRIBUTE = "ATTRIBUTE",
    USER = "USER",
    EMBEDDING = "EMBEDDING",
    HEURISTIC = "HEURISTIC",
    DATA_SLICE = "DATA_SLICE",
    KNOWLEDGE_BASE = "KNOWLEDGE_BASE",
    LABEL = "LABEL"

}

function commentTypeToString(type: CommentType, singular: boolean = false): string {
    switch (type) {
        case CommentType.LABELING_TASK:
        case CommentType.RECORD:
        case CommentType.ORGANIZATION:
        case CommentType.ATTRIBUTE:
        case CommentType.USER:
        case CommentType.EMBEDDING:
        case CommentType.HEURISTIC:
        case CommentType.DATA_SLICE:
        case CommentType.KNOWLEDGE_BASE:
        case CommentType.LABEL:
            let name = type.replace("_", " ").toLowerCase();
            name = name.charAt(0).toUpperCase() + name.slice(1);
            return name + (singular ? "" : "s");
    }
    return "Unknown type"
}
function commentTypeOrder(type: CommentType): number {
    switch (type) {
        case CommentType.ORGANIZATION: return 10;
        case CommentType.USER: return 20;
        case CommentType.ATTRIBUTE: return 30;
        case CommentType.LABELING_TASK: return 40;
        case CommentType.LABEL: return 41;
        case CommentType.EMBEDDING: return 50;
        case CommentType.HEURISTIC: return 60;
        case CommentType.DATA_SLICE: return 70;
        case CommentType.KNOWLEDGE_BASE: return 70;
        case CommentType.RECORD: return 100;
    }
    console.log("unknown comment type", type);
    return -1
}