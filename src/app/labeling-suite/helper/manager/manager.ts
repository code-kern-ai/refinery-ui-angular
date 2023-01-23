import { ActivatedRoute } from "@angular/router";
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
    public baseComponent: LabelingSuiteComponent;

    //general manager
    public settingManager: LabelingSuiteSettingManager;
    public modalManager: LabelingSuiteModalManager;
    public userManager: LabelingSuiteUserManager;
    public sessionManager: LabelingSuiteSessionManager;

    //data manager
    public recordManager: LabelingSuiteRecordManager;
    public taskManager: LabelingSuiteTaskManager;
    public attributeManager: LabelingSuiteAttributeManager;

    public projectId: string;
    public somethingLoading: boolean = true;

    //private changeListener
    private registeredUpdateListeners: Map<UpdateType, Map<Object, () => void>> = new Map<UpdateType, Map<Object, () => void>>();

    constructor(baseComponent: LabelingSuiteComponent, route: ActivatedRoute, projectId: string, projectApolloService: ProjectApolloService, recordApolloService: RecordApolloService) {

        //first check session manager and redirect if necessary

        this.sessionManager = new LabelingSuiteSessionManager(this, route);

        if (this.sessionManager.redirectIfNecessary()) {
            console.log("LabelingSuiteManager redirectIfNessecary")
            return;
        }

        console.log("LabelingSuiteManager no redirect")


        this.projectId = projectId;
        this.baseComponent = baseComponent;
        this.settingManager = new LabelingSuiteSettingManager(projectId);
        this.modalManager = new LabelingSuiteModalManager();
        this.userManager = new LabelingSuiteUserManager(this);

        this.recordManager = new LabelingSuiteRecordManager(projectId, recordApolloService, this);
        this.taskManager = new LabelingSuiteTaskManager(projectId, projectApolloService, this);
        this.attributeManager = new LabelingSuiteAttributeManager(projectId, projectApolloService, this);


        enumToArray(UpdateType).forEach(ct => {
            this.registeredUpdateListeners.set(ct, new Map<Object, () => void>());
        });


        NotificationService.subscribeToNotification(this, {
            projectId: projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });


    }

    public doBeforeDestroy(): void {
        NotificationService.unsubscribeFromNotification(this);

        //destroy for other managers
        this.settingManager.doBeforeDestroy();
        // this.modalManager.doBeforeDestroy(); //atm nothing to do
        this.userManager.doBeforeDestroy();

        this.taskManager.doBeforeDestroy();
        this.recordManager.doBeforeDestroy();
        this.attributeManager.doBeforeDestroy();
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