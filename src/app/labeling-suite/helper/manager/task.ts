import { first } from "rxjs/operators";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { enumToArray, transferNestedDict } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { LabelingSuiteManager, UpdateType } from "./manager";
import { ComponentType } from "./settings";



export class LabelingSuiteTaskManager implements DoBeforeDestroy {
    public labelingTasks: any[];

    private baseManager: LabelingSuiteManager;
    private projectApolloService: ProjectApolloService;
    private projectId: string;


    // private registeredSettingsListeners: Map<ComponentType, Map<Object, () => void>> = new Map<ComponentType, Map<Object, () => void>>();

    constructor(projectId: string, projectApolloService: ProjectApolloService, baseManager: LabelingSuiteManager) {
        this.projectId = projectId;
        this.projectApolloService = projectApolloService;
        this.baseManager = baseManager;

        NotificationService.subscribeToNotification(this, {
            projectId: this.projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });

        this.baseManager.settingManager.registerSettingListener(ComponentType.LABELING, this, () => this.rebuildLabelButtonAmount());
        this.fetchLabelingTasks();
    }

    doBeforeDestroy(): void {
        NotificationService.unsubscribeFromNotification(this, this.projectId);
        this.baseManager.settingManager.unregisterSettingListener(ComponentType.LABELING, this);
    }

    private getWebsocketWhitelist(): string[] {
        let toReturn = ['label_created', 'label_deleted'];
        toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created',]);
        return toReturn;
    }

    private handleWebsocketNotification(msgParts: string[]) {
        if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created'].includes(msgParts[1])) {
            this.fetchLabelingTasks();
        }
        else {
            console.log("unknown message in labeling suite task manager" + msgParts);
        }

    }


    private fetchLabelingTasks() {
        let q, vc;
        [q, vc] = this.projectApolloService.getLabelingTasksByProjectId(this.projectId);
        vc.pipe(first()).subscribe(lt => {
            this.labelingTasks = lt;
            this.rebuildLabelButtonAmount();
            this.baseManager.runUpdateListeners(UpdateType.LABELING_TASKS);
        });
    }

    private rebuildLabelButtonAmount() {
        if (!this.labelingTasks) return;
        if (this.labelingTasks.length == 0) return;
        const displayLabelAmount = this.baseManager.settingManager.settings.labeling.showNLabelButton
        if (this.labelingTasks[0].displayLabels && this.labelingTasks[0].displayLabels.length == displayLabelAmount) return;
        for (const task of this.labelingTasks) {
            task.displayLabels = task.labels.slice(0, displayLabelAmount);
            task.displayLabels.sort((a, b) => a.name.localeCompare(b.name));
        }

    }

    public createLabelInTask(labelName: string, taskId: string) {
        labelName = labelName.trim();
        if (labelName.length == 0) return;
        this.projectApolloService
            .createLabel(this.projectId, taskId, labelName, "yellow")
            .pipe(first())
            .subscribe();
    }


}