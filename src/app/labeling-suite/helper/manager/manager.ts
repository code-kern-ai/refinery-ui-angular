import { first, map } from "rxjs/operators";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { RecordApolloService } from "src/app/base/services/record/record-apollo.service";
import { enumToArray } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { LabelingSuiteComponent } from "../../main-component/labeling-suite.component";
import { LabelingSuiteModalManager } from "./modals";
import { LabelingSuiteRecordManager } from "./record";
import { LabelingSuiteSettingManager } from "./settings";
import { LabelingSuiteUserManager } from "./user";


export class LabelingSuiteManager implements DoBeforeDestroy {
    //base component reference for communication
    public baseComponent: LabelingSuiteComponent;

    //additional manager
    public settingManager: LabelingSuiteSettingManager;
    public modalManager: LabelingSuiteModalManager;
    public recordManager: LabelingSuiteRecordManager;
    public userManager: LabelingSuiteUserManager;

    //private constant references
    private projectId: string;
    private projectApolloService: ProjectApolloService;
    // private recordApolloService: RecordApolloService;


    //public accessible data
    public attributes: any[];
    public labelingTasks: any[];

    //private data for config


    //private changeListener
    private registeredUpdateListeners: Map<UpdateType, Map<Object, () => void>> = new Map<UpdateType, Map<Object, () => void>>();

    constructor(projectId: string, projectApolloService: ProjectApolloService, recordApolloService: RecordApolloService, baseComponent: LabelingSuiteComponent) {
        this.projectId = projectId;
        this.projectApolloService = projectApolloService;
        // this.recordApolloService = recordApolloService;
        this.baseComponent = baseComponent;
        this.settingManager = new LabelingSuiteSettingManager();
        this.modalManager = new LabelingSuiteModalManager();
        this.recordManager = new LabelingSuiteRecordManager(projectId, recordApolloService, this);
        this.userManager = new LabelingSuiteUserManager();

        enumToArray(UpdateType).forEach(ct => {
            this.registeredUpdateListeners.set(ct, new Map<Object, () => void>());
        });


        NotificationService.subscribeToNotification(this, {
            projectId: projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });
        this.fetchAttributes();
        this.fetchLabelingTasks();


    }

    public doBeforeDestroy(): void {
        NotificationService.unsubscribeFromNotification(this);

        //destroy for other managers
        this.settingManager.doBeforeDestroy();
        // this.modalManager.doBeforeDestroy(); //atm nothing to do
        this.recordManager.doBeforeDestroy();
        this.userManager.doBeforeDestroy();
    }



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
        toReturn.push(...['access_link_changed', 'access_link_removed']);
        return toReturn;
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


    public registerUpdateListenerAndDo(type: UpdateType, caller: Object, func: () => void) {
        if (!this.registeredUpdateListeners.has(type)) throw Error("Update type not available");
        this.registeredUpdateListeners.get(type).set(caller, func);
        func.call(caller);
    }
    public unregisterUpdateListener(type: UpdateType, caller: Object) {
        if (!this.registeredUpdateListeners.has(type)) throw Error("Update type not available");
        if (this.registeredUpdateListeners.get(type).get(caller)) {
            this.registeredUpdateListeners.get(type).delete(caller);
        }
    }

    public runUpdateListeners(type: UpdateType) {
        if (!this.registeredUpdateListeners.has(type)) throw Error("Update type not available");
        if (this.registeredUpdateListeners.get(type).size == 0) return;
        this.registeredUpdateListeners.get(type).forEach((func, key) => func.call(key));
    }

}


export enum UpdateType {
    RECORD
}