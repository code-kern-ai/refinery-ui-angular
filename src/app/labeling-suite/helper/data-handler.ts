import { combineLatest, Observable, Subscription } from "rxjs";
import { first, map } from "rxjs/operators";
import { CommentDataManager, CommentType } from "src/app/base/components/comment/comment-helper";
import { InformationSourceReturnType } from "src/app/base/enum/graphql-enums";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { RecordApolloService } from "src/app/base/services/record/record-apollo.service";
import { getUserAvatarUri, jsonCopy } from "src/app/util/helper-functions";
import { UserManager } from "src/app/util/user-manager";
import { LabelingSuiteComponent } from "../main-component/labeling-suite.component";


export class LabelingDataHandler {

    //private constant references
    private projectId: string;
    private projectApolloService: ProjectApolloService;
    private recordApolloService: RecordApolloService;
    private baseComponent: LabelingSuiteComponent;

    //private data for preparation
    private attributes: any[];
    private labelingTasks: any[];
    private recordData: RecordData = {
        baseRecord: null,
        token: null,
        rlas: null,
    };

    //public accessible data
    public mainUser: UserData;
    public allUsers: UserData[];

    //private data for config
    private activeRecordId: string;
    private recordRequests = {
        record: null as Subscription,
        token: null as Subscription,
        rla: null as Subscription,
        rlaQuery: null as any,
    }

    constructor(projectId: string, projectApolloService: ProjectApolloService, recordApolloService: RecordApolloService, baseComponent: LabelingSuiteComponent) {
        this.projectId = projectId;
        this.projectApolloService = projectApolloService;
        this.recordApolloService = recordApolloService;
        this.baseComponent = baseComponent;

        UserManager.registerAfterInitActionOrRun(this, this.prepareUserData, true);
        NotificationService.subscribeToNotification(this, {
            projectId: projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });
        this.fetchAttributes();
        this.fetchLabelingTasks();
    }

    private prepareUserData() {
        const user = UserManager.getUser();
        this.mainUser = {
            data: user,
            avatarUri: getUserAvatarUri(user),
            isLoggedInUser: true,
        }
        this.allUsers = UserManager.getAllUsers().map(u => ({
            data: u,
            avatarUri: getUserAvatarUri(u),
            isLoggedInUser: u.id == this.mainUser.data.id
        }));
    }

    // private getWebsocketWhitelist(): string[] {
    //     const toReturn = ['attributes_updated', 'calculate_attribute'];
    //     toReturn.push(...['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);

    //     return toReturn;
    // }
    private getWebsocketWhitelist(): string[] {
        let toReturn = ['label_created', 'label_deleted', 'attributes_updated', 'calculate_attribute'];
        toReturn.push(...['payload_finished', 'weak_supervision_finished']);
        toReturn.push(
            ...[
                'labeling_task_deleted',
                'labeling_task_updated',
                'labeling_task_created',
            ]
        );
        toReturn.push(...['record_deleted', 'rla_created', 'rla_deleted']);
        toReturn.push(...['access_link_changed', 'access_link_removed']);
        return toReturn;
    }
    public unsubscribeFromWebsocket() {
        NotificationService.unsubscribeFromNotification(this);
    }

    private fetchAttributes() {
        let q, vc;
        [q, vc] = this.projectApolloService.getAttributesByProjectId(this.projectId);
        vc.pipe(first()).subscribe(att => this.attributes = att);
    }

    private fetchLabelingTasks() {
        let q, vc;
        [q, vc] = this.projectApolloService.getLabelingTasksByProjectId(this.projectId);
        vc.pipe(first()).subscribe(lt => this.labelingTasks = lt);
    }


    private handleWebsocketNotification(msgParts: string[]) {
        if (msgParts[1] == 'attributes_updated' || (msgParts[1] == 'calculate_attribute' && msgParts[2] == 'created')) {
            this.fetchAttributes();
        } else if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created'].includes(msgParts[1])) {
            this.fetchLabelingTasks();
        }

        else {
            console.log("unknown message in labeling suite data handler: " + msgParts);
        }

    }


    public collectRecordData(recordId: string) {
        if (recordId == null || recordId == "deleted") {
            // this.fullRecordData = { id: recordId };
            // if (this.recordLabelAssociations$) this.recordLabelAssociations$.unsubscribe();
            console.log("no record id provided (collect record data)")
            return;
        }
        if (this.activeRecordId) {
            CommentDataManager.unregisterPartialCommentRequests(this, [{ commentType: CommentType.RECORD, projectId: this.projectId, commentKey: this.activeRecordId }]);
        }
        this.activeRecordId = recordId;
        CommentDataManager.registerCommentRequests(this, [{ commentType: CommentType.RECORD, projectId: this.projectId, commentKey: this.activeRecordId }]);

        //   this.labelingTasksQuery$.refetch();
        //call parallel so time isn't lost for each request
        let collectionTasks = [];
        collectionTasks.push(this.prepareTokenizedRecord(recordId));
        collectionTasks.push(this.prepareRecordRequest(recordId));
        collectionTasks.push(this.prepareRlaRequest(recordId));
        combineLatest(collectionTasks).subscribe((results: any[]) => this.finishUpRecordData(results));
        // combineLatest(this.prepareTokenizedRecord(recordId),this.prepareTokenizedRecord(recordId),this.prepareTokenizedRecord(recordId)).subscribe();

    }

    private finishUpRecordData(results: any[]) {
        console.log("fully loaded", results);
        this.recordData.token = results[0];
        this.recordData.baseRecord = results[1];
        let rlas = results[2];
        if (this.ignoreRlas(rlas)) return;
        rlas = jsonCopy(rlas);
        this.recordData.rlas = this.finalizeRlas(rlas);

        this.baseComponent.setOverviewTableData(this.recordData.rlas);

    }
    private finalizeRlas(rlas: any[]): any[] {
        if (!rlas) return [];
        for (const e of rlas) {
            if (e.returnType == InformationSourceReturnType.RETURN) continue;
            const attributeId = e.labelingTaskLabel.labelingTask.attribute.id;
            let att = this.getTokenizedAttribute(attributeId);
            let t1 = this.getToken(att, e.tokenStartIdx);
            let t2 = this.getToken(att, e.tokenEndIdx);
            e.value = att.raw.substring(t1.posStart, t2.posEnd);
        }
        return rlas;
    }
    private getTokenizedAttribute(attributeId: string) {
        for (let att of this.recordData.token.attributes) {
            if (att.attributeId == attributeId) return att;
        }
        return null;
    }
    private getToken(tokenizedAttribute, idx: number) {
        for (let token of tokenizedAttribute.token) {
            if (token.idx == idx) return token;
        }
        return null;
    }

    private prepareTokenizedRecord(recordId: string): Observable<any> {
        if (this.recordRequests.token) this.recordRequests.token.unsubscribe();
        const firstPipe = this.recordApolloService.getTokenizedRecord(recordId).pipe(first());
        this.recordRequests.token = firstPipe.subscribe((r) => {
            if (!r) return;
            //   this.addTokenDataToTask(r);
            //   this.prepareInformationExtractionDisplay();
            //   if (fullRefresh) {
            //     this.userTaskGold.clear();
            //     this.prepareFullRecord();
            //   }
            this.recordRequests.token = null;
        });
        return firstPipe;
    }

    private prepareRecordRequest(recordId: string): Observable<any> {
        if (this.recordRequests.record) this.recordRequests.record.unsubscribe();
        const firstPipe = this.recordApolloService.getRecordByRecordId(this.projectId, recordId).pipe(first());
        this.recordRequests.record = firstPipe.subscribe((recordData) => {
            if (!recordData) {
                // this.huddleData.recordIds[this.huddleData.linkData.requestedPos - 1] = "deleted"
                // this.jumpToPosition(this.project.id, this.huddleData.linkData.requestedPos);
                console.log("no record data found (collect record data)")
                return;
            }

            //   this.recordData = recordData;
            //   this.prepareFullRecord();
            //   this.prepareInformationExtractionDisplay();
            this.recordRequests.record = null;
        });
        return firstPipe;
    }

    private prepareRlaRequest(recordId: string): Observable<any> {
        if (this.recordRequests.rla) this.recordRequests.rla.unsubscribe();
        let observable;
        [this.recordRequests.rlaQuery, observable] = this.recordApolloService.getRecordLabelAssociations(this.projectId, recordId);
        this.recordRequests.rla = observable
            .subscribe((recordLabelAssociations) => {
                if (this.ignoreRlas(recordLabelAssociations)) return;
                // const rlaData = this.prepareRLADataForRole(recordLabelAssociations);
                // this.extendRecordLabelAssociations(rlaData);
                // this.parseRlaToGroups(rlaData)
                // this.prepareFullRecord();
                // this.prepareInformationExtractionDisplay();
                // this.somethingLoading = false;

            });
        return observable;
    }

    private ignoreRlas(rlas: any): boolean {
        if (!rlas) return true;
        if (rlas.length > 0 && rlas[0].recordId != this.activeRecordId) return true;
        return false;
    }

}


type UserData = {
    data: any;
    avatarUri: string;
    isLoggedInUser: boolean;
}
type RecordData = {
    token: any;
    baseRecord: any;
    rlas: any[];
}