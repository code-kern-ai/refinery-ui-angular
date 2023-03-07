import { timer } from "rxjs";
import { first } from "rxjs/operators";
import { LabelingTask, LabelingTaskTarget } from "src/app/base/enum/graphql-enums";
import { KnowledgeBasesApolloService } from "src/app/base/services/knowledge-bases/knowledge-bases-apollo.service";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { BricksIntegratorComponent } from "../bricks-integrator.component";
import { isoCodes, mostRelevant } from "./language-iso";


export class BricksDataRequestor {
    private projectApolloService: ProjectApolloService;
    private knowledgeBaseApollo: KnowledgeBasesApolloService;
    private base: BricksIntegratorComponent
    private projectId: string;
    private attributes: any[];
    private labelingTasks: any[];
    private embeddings: any[];
    private lookupLists: any[];


    private pauseTaskFetch: boolean = false;

    constructor(projectApolloService: ProjectApolloService, knowledgeBaseApollo: KnowledgeBasesApolloService, projectId: string, base: BricksIntegratorComponent) {
        this.base = base;
        this.projectApolloService = projectApolloService;
        this.knowledgeBaseApollo = knowledgeBaseApollo;
        this.projectId = projectId;

        NotificationService.subscribeToNotification(this, {
            projectId: projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });
        this.fetchAttributes();
        this.fetchLabelingTasks();
        this.fetchEmbeddings();
        this.fetchLookupLists();
    }

    private getWebsocketWhitelist(): string[] {
        const toReturn = ['attributes_updated', 'calculate_attribute'];
        toReturn.push(...['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
        toReturn.push(...['embedding', 'embedding_deleted']);
        toReturn.push(...['knowledge_base_deleted', 'knowledge_base_created']);

        return toReturn;
    }

    public unsubscribeFromWebsocket() {
        NotificationService.unsubscribeFromNotification(this);
    }

    private fetchAttributes() {
        let q, vc;
        [q, vc] = this.projectApolloService.getAttributesByProjectId(this.projectId, ['ALL']);
        vc.pipe(first()).subscribe(att => this.attributes = att);
    }

    private fetchLabelingTasks(doAfter?: () => void) {
        let q, vc;
        [q, vc] = this.projectApolloService.getLabelingTasksByProjectId(this.projectId);
        vc.pipe(first()).subscribe(lt => {
            this.labelingTasks = lt;
            if (doAfter) doAfter();
        });
    }

    private fetchEmbeddings() {
        let q, vc;
        [q, vc] = this.projectApolloService.getEmbeddingSchema(this.projectId);
        vc.pipe(first()).subscribe(e => this.embeddings = e);
    }
    private fetchLookupLists() {
        let q, vc;
        [q, vc] = this.knowledgeBaseApollo.getKnowledgeBasesByProjectId(this.projectId);
        vc.pipe(first()).subscribe(ll => this.lookupLists = ll);
    }

    public getAttributes(typeFilter: string[] = ['TEXT'], stateFilter: string[] = ["UPLOADED", "USABLE", "AUTOMATICALLY_CREATED"]): any[] {
        if (!this.attributes) {
            console.log("attributes not yet loaded");
            return null;
        }
        let filtered = this.attributes.filter(att => stateFilter.includes(att.state));
        if (typeFilter) {
            filtered = filtered.filter(att => typeFilter.includes(att.dataType));
        }
        if (filtered.length == 0) return ['No useable attributes'];
        return filtered;
    }

    public getLabelingTasks(typeFilter: string = null, targetFilter: string = null): any[] {
        if (!this.labelingTasks) {
            console.log("labeling Tasks not yet loaded");
            return null;
        }
        let filtered = this.labelingTasks;
        if (typeFilter) {
            filtered = filtered.filter(lt => lt.taskType == typeFilter);
        } if (targetFilter) {
            filtered = filtered.filter(lt => lt.taskTarget == targetFilter);
        }
        if (filtered.length == 0) return ['No useable labeling tasks'];
        return filtered;
    }

    public getLabelingTaskAttribute(labelingTaskId: string, attribute: string) {
        if (!this.labelingTasks) {
            console.log("labeling Tasks not yet loaded");
            return null;
        }
        let filtered = this.labelingTasks.find(lt => lt.id == labelingTaskId);
        if (filtered) return filtered[attribute];
        else return null;
    }

    public getLabels(labelingTaskId: string): any[] {
        if (!this.labelingTasks) {
            console.log("labeling Tasks not yet loaded");
            return null;
        }
        let filtered = this.labelingTasks.find(lt => lt.id == labelingTaskId);
        if (filtered && filtered.labels.length > 0) return filtered.labels;
        else return ['No useable labels'];
    }

    public getEmbeddings(labelingTaskId: string = null): any[] {
        if (!this.embeddings || !this.labelingTasks) {
            console.log("labeling Tasks or embeddings not yet loaded");
            return null;
        }
        if (!labelingTaskId) return this.embeddings.map(x => x); //copy of array not of values
        const task = this.labelingTasks.find(lt => lt.id == labelingTaskId);
        if (!task) return ['No useable embeddings'];
        const onlyAttribute = task.taskType == LabelingTask.MULTICLASS_CLASSIFICATION
        let filtered = this.embeddings.filter(e => (e.type == LabelingTaskTarget.ON_ATTRIBUTE && onlyAttribute) || (e.type != LabelingTaskTarget.ON_ATTRIBUTE && !onlyAttribute));
        if (filtered && filtered.length > 0) return filtered;
        else return ['No useable embeddings'];
    }
    public getLookupLists(): any[] {
        if (!this.lookupLists) {
            console.log("lookup lists not yet loaded");
            return null;
        }
        if (this.lookupLists.length > 0) return this.lookupLists;
        else return ['No useable lookup lists'];
    }

    public getIsoCodes(onlyMostRelevant: boolean = true): { code: string, name: string }[] {
        return isoCodes.filter(e => !onlyMostRelevant || mostRelevant.includes(e.code));
    }


    private handleWebsocketNotification(msgParts: string[]) {
        if (msgParts[1] == 'attributes_updated' || (msgParts[1] == 'calculate_attribute' && msgParts[2] == 'created')) {
            this.fetchAttributes();
        } else if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created'].includes(msgParts[1])) {
            if (!this.pauseTaskFetch) this.fetchLabelingTasks();
        } else if (msgParts[1] == 'embedding_deleted') {
            this.fetchEmbeddings();
        } else if (msgParts[1] == 'embedding' && msgParts[3] == "state" && msgParts[4] == "FINISHED") {
            this.fetchEmbeddings();
        } else if (['knowledge_base_deleted', 'knowledge_base_created'].includes(msgParts[1])) {
            this.fetchLookupLists();
        }

    }

    public createNewLabelingTask(taskName: string, includedLabels: string[]) {
        if (!includedLabels.length) return;
        this.pauseTaskFetch = true;
        const taskType = 'MULTICLASS_CLASSIFICATION';// currently only option since extraction would require a new attribute as well!!
        let finalTaskName = taskName;

        let c = 0;
        while (!!this.labelingTasks.find(lt => lt.name == finalTaskName)) {
            finalTaskName = taskName + " " + ++c;
        }
        this.projectApolloService.addLabelingTaskAndLabels(this.projectId, finalTaskName, taskType, null, includedLabels).pipe(first()).subscribe((r: any) => {
            const taskId = r.data?.createTaskAndLabels?.taskId;
            if (taskId) {
                this.fetchLabelingTasks(() => {
                    this.base.selectDifferentTask(taskId);
                    this.pauseTaskFetch = false;
                })
            }
        });
    }
    public createMissingLabels(taskId: string, missingLabels: string[]) {
        if (!missingLabels.length) return;
        this.projectApolloService.createLabels(this.projectId, taskId, missingLabels).pipe(first()).subscribe((r: any) => this.fetchLabelingTasks(() => {
            this.base.selectDifferentTask(taskId);
            this.pauseTaskFetch = false;
        }));
    }

}