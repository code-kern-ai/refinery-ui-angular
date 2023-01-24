import { ActivatedRoute, Router } from "@angular/router";
import { first, map } from "rxjs/operators";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { RecordApolloService } from "src/app/base/services/record/record-apollo.service";
import { enumToArray } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { LabelingSuiteComponent } from "../../main-component/labeling-suite.component";
import { LabelingSuiteAttributeManager } from "./attribute";
import { LabelingSuiteModalManager } from "./modals";
import { LabelingSuiteRecordManager } from "./record";
import { LabelingSuiteSessionManager } from "./session";
import { LabelingSuiteSettingManager } from "./settings";
import { LabelingSuiteTaskManager } from "./task";
import { LabelingSuiteUserManager } from "./user";


export class LabelingSuiteManager implements DoBeforeDestroy {
    //base component reference for communication
    // public baseComponent: LabelingSuiteComponent;

    //general manager
    public settingManager: LabelingSuiteSettingManager;
    public modalManager: LabelingSuiteModalManager;
    public userManager: LabelingSuiteUserManager;
    public sessionManager: LabelingSuiteSessionManager;

    //data manager
    public recordManager: LabelingSuiteRecordManager;
    public taskManager: LabelingSuiteTaskManager;
    public attributeManager: LabelingSuiteAttributeManager;

    public somethingLoading: boolean = true;
    public sufficientInitialized: boolean = false;

    //private changeListener
    private registeredUpdateListeners: Map<UpdateType, Map<Object, () => void>> = new Map<UpdateType, Map<Object, () => void>>();

    constructor(
        public projectId: string,
        public baseComponent: LabelingSuiteComponent,
        private route: ActivatedRoute,
        private router: Router,
        private projectApolloService: ProjectApolloService,
        private recordApolloService: RecordApolloService) {

        enumToArray(UpdateType).forEach(ct => {
            this.registeredUpdateListeners.set(ct, new Map<Object, () => void>());
        });


        NotificationService.subscribeToNotification(this, {
            projectId: projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });

        //first setup User manager since some roles are barred from collecting data though other managers
        //the userManager calls the setupAfterUserInit function after the user is initialized
        this.userManager = new LabelingSuiteUserManager(this);
        this.userManager.finishUpSetup();

    }

    public nextRecord() {
        if (this.sessionManager.nextDisabled) return;
        this.recordManager.initRecordData();
        this.sessionManager.nextRecord();
    }
    public previousRecord() {
        if (this.sessionManager.prevDisabled) return;
        this.recordManager.initRecordData();
        this.sessionManager.previousRecord();
    }

    public setupAfterUserInit() {
        //next check if session stuff is valid or needs redirection
        this.sessionManager = new LabelingSuiteSessionManager(this, this.route, this.router, this.projectApolloService);
        if (!this.sessionManager.redirected) this.sessionManager.setupInitialTasks();
    }

    public setupAfterSessionInit() {
        // last other mangers can be initialized
        this.settingManager = new LabelingSuiteSettingManager(this.projectId);
        this.modalManager = new LabelingSuiteModalManager();

        this.recordManager = new LabelingSuiteRecordManager(this.projectId, this.recordApolloService, this);
        this.taskManager = new LabelingSuiteTaskManager(this.projectId, this.projectApolloService, this);
        this.attributeManager = new LabelingSuiteAttributeManager(this.projectId, this.projectApolloService, this);
        this.sufficientInitialized = true;
        this.sessionManager.prepareLabelingSession();
    }

    public doBeforeDestroy(): void {
        NotificationService.unsubscribeFromNotification(this);

        //destroy for other managers
        if (this.userManager) this.userManager.doBeforeDestroy();

        if (this.sessionManager) this.sessionManager.doBeforeDestroy();

        if (this.settingManager) this.settingManager.doBeforeDestroy();
        // this.modalManager.doBeforeDestroy(); //atm nothing to do
        if (this.taskManager) this.taskManager.doBeforeDestroy();
        if (this.recordManager) this.recordManager.doBeforeDestroy();
        if (this.attributeManager) this.attributeManager.doBeforeDestroy();
        if (this.sessionManager) this.sessionManager.doBeforeDestroy();
    }



    private getWebsocketWhitelist(): string[] {
        let toReturn = [];
        toReturn.push(...['access_link_changed', 'access_link_removed']);
        return toReturn;
    }


    private handleWebsocketNotification(msgParts: string[]) {
        {
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
    RECORD,
    LABELING_TASKS,
    ATTRIBUTES,
    DISPLAY_USER
}