import { combineLatest, Observable, Subscription } from "rxjs";
import { first } from "rxjs/operators";
import { CommentDataManager, CommentType } from "src/app/base/components/comment/comment-helper";
import { InformationSourceReturnType } from "src/app/base/enum/graphql-enums";
import { NotificationService } from "src/app/base/services/notification.service";
import { RecordApolloService } from "src/app/base/services/record/record-apollo.service";
import { jsonCopy } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { LabelingSuiteManager, UpdateType } from "./manager";

type RecordData = {
    deleted: boolean;
    token: any;
    baseRecord: any;
    rlas: any[];
}

export class LabelingSuiteRecordManager implements DoBeforeDestroy {
    private baseManager: LabelingSuiteManager;
    private recordApolloService: RecordApolloService;
    private projectId: string;
    public recordData: RecordData = {
        deleted: false,
        baseRecord: null,
        token: null,
        rlas: null,
    };

    private activeRecordId: string;
    private recordRequests = {
        record: null as Subscription,
        token: null as Subscription,
        rla: null as Subscription,
        rlaQuery: null as any,
    };


    constructor(projectId: string, recordApolloService: RecordApolloService, baseManager: LabelingSuiteManager) {
        this.projectId = projectId;
        this.recordApolloService = recordApolloService;
        this.baseManager = baseManager;


        NotificationService.subscribeToNotification(this, {
            projectId: this.projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });
    }

    doBeforeDestroy(): void {
        NotificationService.unsubscribeFromNotification(this, this.projectId);
    }

    private getWebsocketWhitelist(): string[] {
        let toReturn = [];
        toReturn.push(...['record_deleted', 'rla_created', 'rla_deleted']);
        return toReturn;
    }

    private handleWebsocketNotification(msgParts: string[]) {
        if (msgParts[1] == 'record_deleted') {
            console.log("record deleted");
            this.setDeletedState();
        }
        else {
            console.log("unknown message in labeling suite record manager" + msgParts);
        }

    }




    public collectRecordData(recordId: string) {
        if (recordId == null) {
            // this.fullRecordData = { id: recordId };
            // if (this.recordLabelAssociations$) this.recordLabelAssociations$.unsubscribe();
            console.log("no record id provided (collect record data)")
            return;
        }
        if (recordId == "deleted") {
            this.recordData.deleted = true;
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
        if (this.ignoreRlas(rlas)) {
            this.baseManager.runUpdateListeners(UpdateType.RECORD);
            return;
        }
        rlas = jsonCopy(rlas);
        this.recordData.rlas = this.finalizeRlas(rlas);
        this.baseManager.runUpdateListeners(UpdateType.RECORD);

        // this.baseComponent.setOverviewTableData(this.recordData.rlas);
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
                this.recordData.deleted = true;
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


    public deleteRecord() {
        if (this.recordData.deleted) return;
        console.log("delete record -> nonthing done though since dev")
        return;
        const recordId = this.recordData.baseRecord.id;
        this.recordApolloService.deleteRecordByRecordId(this.projectId, recordId)
            .pipe(first()).subscribe((r) => {
                if (r['data']['deleteRecord']?.ok) {
                    this.setDeletedState();
                    //   this.huddleData.recordIds[this.huddleData.linkData.requestedPos - 1] = "deleted"
                    //   let jumpPos = this.huddleData.linkData.requestedPos + 1;
                    //   if (jumpPos >= this.huddleData.recordIds.length) jumpPos -= 2;
                    //   this.jumpToPosition(this.project.id, jumpPos);
                } else {
                    console.log("Something went wrong with deletion of record:" + recordId);
                }
            });
    }

    private setDeletedState() {

        this.recordData.deleted = true;
        this.recordData.baseRecord = null;
        this.recordData.rlas = null;
        this.recordData.token = null;
    }

}