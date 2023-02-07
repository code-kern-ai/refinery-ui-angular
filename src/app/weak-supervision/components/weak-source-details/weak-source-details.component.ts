import {
  Component,
  OnDestroy,
  OnInit,
  ViewChildren,
  ElementRef,
  AfterViewInit,
  QueryList,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { first } from 'rxjs/operators';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import {
  debounceTime,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';
import { forkJoin, Subscription, timer } from 'rxjs';
import { InformationSourceType, informationSourceTypeToString, LabelingTask, LabelSource } from 'src/app/base/enum/graphql-enums';
import { InformationSourceCodeLookup, InformationSourceExamples } from '../information-sources-code-lookup';
import { dateAsUTCDate, getColorForDataType, getPythonClassName, getPythonClassRegExMatch, getPythonFunctionName, getPythonFunctionRegExMatch, toPythonFunctionName } from 'src/app/util/helper-functions';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { schemeCategory24 } from 'src/app/util/colors';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { dataTypes } from 'src/app/util/data-types';
import { KnowledgeBasesApolloService } from 'src/app/base/services/knowledge-bases/knowledge-bases-apollo.service';
import { createDefaultHeuristicsDetailsModals, HeuristicsDetailsModals } from './weak-source-details-helper';
import { AttributeVisibility } from 'src/app/projects/components/create-new-attribute/attributes-visibility-helper';
import { BricksIntegratorComponent } from 'src/app/base/components/bricks-integrator/bricks-integrator.component';
import { Attributes } from 'src/app/base/components/record-display/record-display.helper';

@Component({
  selector: 'kern-weak-source-details',
  templateUrl: './weak-source-details.component.html',
  styleUrls: ['./weak-source-details.component.scss'],
})
export class WeakSourceDetailsComponent
  implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('descriptionArea') descriptionArea: QueryList<ElementRef>;
  @ViewChildren('nameArea') nameArea: QueryList<ElementRef>;
  @ViewChild(BricksIntegratorComponent) bricksIntegrator: BricksIntegratorComponent;
  get LabelSourceType(): typeof LabelSource {
    return LabelSource;
  }
  get InformationSourceType(): typeof InformationSourceType {
    return InformationSourceType;
  }

  colors = schemeCategory24;

  justClickedRun: boolean = false;
  requestTimeOut: boolean = false;

  loggedInUser: any;
  updatedThroughWebsocket: boolean;

  routeParams$: any;
  project: any;
  informationSource$: any;
  informationSourceQuery$: any;
  informationSource: any;
  subscriptions$: Subscription[] = [];
  lastTask$: any;
  lastTaskLogs: string[];
  lastTaskQuery$: any;
  labelingTasksQuery$: any;
  labelingTasks: Map<string, any> = new Map<string, any>();
  labelingTasksSortOrder = [];
  labelingTaskControl = new FormControl('');

  editorOptions = { theme: 'vs-light', language: 'python' };
  description: string = '';
  descriptionOpen: boolean = false;
  informationSourceName: string = '';
  nameOpen: boolean = false;
  codeFormCtrl = new FormControl('');
  specificRunOpen: Number = -1;
  specificRunTaskInformation$: any;
  embeddings: any;
  embeddingsFiltered: any;
  embeddingQuery$: any;
  knowledgeBases: any;
  knowledgeBasesQuery$: any;
  status: string;
  attributesQuery$: any;
  attributes: any;
  attributesView: any[] = [];
  isHeaderNormal: boolean = true;
  sampleRecords: any;
  selectedAttribute: string = '';
  dataTypesArray = dataTypes;
  displayLogWarning: boolean = false;
  isInitialLf: boolean = null; //null as add state to differentiate between initial, not and unchecked
  heuristicDetailsModals: HeuristicsDetailsModals = createDefaultHeuristicsDetailsModals();
  attributeDetails: Attributes;

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private informationSourceApolloService: WeakSourceApolloService,
    private organizationService: OrganizationApolloService,
    private knowledgeBaseApollo: KnowledgeBasesApolloService,
  ) { }

  getTargetTaskLabels() {
    const targetTask = this.labelingTasks.get(this.labelingTaskControl.value);
    return targetTask.labels;
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.organizationService.getUserInfo().pipe(first()).subscribe((user) => this.loggedInUser = user);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    const isType = this.activatedRoute.parent.snapshot.queryParams.type;
    this.status = this.activatedRoute.parent.snapshot.queryParams.status;
    const project$ = this.projectApolloService.getProjectById(projectId);
    let tasks$ = [];
    tasks$.push(this.prepareLabelingTaskRequest(projectId));
    tasks$.push(this.prepareAttributes(projectId));
    if (isType == InformationSourceType.ACTIVE_LEARNING) tasks$.push(this.prepareEmbeddingsRequest(projectId));
    if (isType == InformationSourceType.LABELING_FUNCTION) tasks$.push(this.prepareKnowledgeRequest(projectId));
    tasks$.push(project$.pipe(first()));

    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    forkJoin(tasks$).subscribe(() => this.prepareInformationSource(projectId));

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
    this.setUpCommentRequests(projectId, isType);
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['payload_finished', 'payload_failed', 'payload_created', 'payload_update_statistics'];
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
    toReturn.push(...['information_source_deleted', 'information_source_updated']);
    toReturn.push(...['label_created', 'label_deleted']);
    toReturn.push(...['embedding_deleted', 'embedding']);
    toReturn.push(...['knowledge_base_updated', 'knowledge_base_deleted', 'knowledge_base_created']);
    return toReturn;
  }
  private setUpCommentRequests(projectId: string, isType: string) {
    const requests = [];
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.HEURISTIC, projectId: projectId });
    if (isType == InformationSourceType.ACTIVE_LEARNING) requests.push({ commentType: CommentType.EMBEDDING, projectId: projectId });
    if (isType == InformationSourceType.LABELING_FUNCTION) requests.push({ commentType: CommentType.KNOWLEDGE_BASE, projectId: projectId });
    else requests.push({ commentType: CommentType.KNOWLEDGE_BASE, projectId: projectId });
    requests.push({ commentType: CommentType.LABEL, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  ngAfterViewInit() {
    //this.setFocus();
    this.descriptionArea.changes.subscribe(() => {
      this.setFocus(this.descriptionArea);
    });
    this.nameArea.changes.subscribe(() => {
      this.setFocus(this.nameArea);
    });
  }


  handleWebsocketNotification(msgParts) {
    if (!this.informationSource) return;
    if (['labeling_task_updated', 'labeling_task_created', 'label_created', 'label_deleted'].includes(msgParts[1])) {
      this.labelingTasksQuery$.refetch();
    } else if ('labeling_task_deleted' == msgParts[1]) {
      alert('Parent labeling task was deleted!');
      this.router.navigate(["../"], { relativeTo: this.activatedRoute });
    } else if ('information_source_deleted' == msgParts[1]) {
      if (this.informationSource.id == msgParts[2]) {
        alert('Information source was deleted!');
        this.router.navigate(["../"], { relativeTo: this.activatedRoute });
      }
    } else if ('information_source_updated' == msgParts[1]) {
      if (this.informationSource.id == msgParts[2]) {
        this.updatedThroughWebsocket = true;
        this.informationSourceQuery$.refetch();
      }
    } else if (msgParts[1] == 'embedding_deleted' || (msgParts[1] == 'embedding' && msgParts[3] == 'state')) {
      if (this.embeddingQuery$) this.embeddingQuery$.refetch();
    } else if (['knowledge_base_updated', 'knowledge_base_deleted', 'knowledge_base_created'].includes(msgParts[1])) {
      if (this.knowledgeBasesQuery$) this.knowledgeBasesQuery$.refetch();
    }
    else {
      if (msgParts[2] != this.informationSource.id) return;
      this.informationSourceQuery$.refetch();

      if (msgParts[1] == 'payload_finished' || msgParts[1] == 'payload_failed' || msgParts[1] == 'payload_created') {
        if (this.lastTaskQuery$) this.lastTaskQuery$.refetch();
      }
    }
  }

  prepareInformationSource(projectId: string) {
    const informationSourceId = this.activatedRoute.snapshot.paramMap.get('informationSourceId');
    [this.informationSourceQuery$, this.informationSource$] = this.informationSourceApolloService.getInformationSourceBySourceId(projectId, informationSourceId);
    this.subscriptions$.push(this.informationSource$.subscribe((informationSource) => {
      if (informationSource.lastTask) {
        const task = informationSource.lastTask
        this.status = task.state;
        if (task.createdAt && task.finishedAt) {
          task.durationText = this.timeDiffCalc(dateAsUTCDate(new Date(task.createdAt)), dateAsUTCDate(new Date(task.finishedAt)));
        }
      }
      this.labelingTaskControl.setValue(informationSource.labelingTaskId);
      this.informationSource = informationSource;
      if (!this.codeFormCtrl.value) this.prepareSourceCode(projectId, informationSource);
      else this.checkLogs(projectId, informationSource);

      this.description = informationSource.description;
      this.informationSourceName = informationSource.name;
      this.justClickedRun = false;
      timer(250).subscribe(() => this.updatedThroughWebsocket = false);
    }));
  }

  canStartISRun(): boolean {
    if (this.justClickedRun) return false;
    if (!this.informationSource) return false;
    if (!this.informationSource.lastTask) return true;
    if (this.informationSource.lastTask.state == 'FINISHED' || this.informationSource.lastTask.state == 'FAILED') return true;
    const d: Date = dateAsUTCDate(new Date(this.informationSource.lastTask.createdAt));
    const current: Date = new Date();
    if (d.getTime() - current.getTime() > 600000) return true; // older than 10 min
    return false;
  }

  timeDiffCalc(dateA: any, dateB: any = Date.now()) {
    return new Date(Math.abs(dateB - dateA)).toISOString().substring(11, 19);
  }

  prepareLabelingTaskRequest(projectId: string) {
    let vc;
    [this.labelingTasksQuery$, vc] = this.projectApolloService.getLabelingTasksByProjectId(projectId);

    vc.subscribe((tasks) => {
      tasks.sort((a, b) => a.relativePosition - b.relativePosition)
      this.labelingTasks.clear();
      this.labelingTasksSortOrder = [];
      let labelIds = [];
      tasks.forEach((task) => {
        this.labelingTasks.set(task.id, task);
        this.labelingTasksSortOrder.push({ key: task.id, order: task.relativePosition, name: task.name });
        labelIds.push(...task.labels.map((label) => label.id));
      });
      this.colors.domain(labelIds);
    });

    this.labelingTaskControl.valueChanges.pipe(distinctUntilChanged(), startWith("")).subscribe((labelingTaskId) => {
      this.checkTemplateCodeChange();
      if (this.hasUnsavedChanges()) {
        this.saveInformationSource(projectId);
      }
      this.filterEmbeddingsForCurrentTask();
    });
    return vc.pipe(first());
  }

  prepareSourceCode(projectId: string, informationSource: any) {
    if (!this.codeFormCtrl.value || this.updatedThroughWebsocket) {

      if (informationSource.informationSourceType == InformationSourceType.LABELING_FUNCTION) {
        this.codeFormCtrl.setValue(informationSource.sourceCode.replace(
          'def lf(record',
          'def ' + informationSource.name + '(record'
        ));
      } else if (this.informationSource.informationSourceType == InformationSourceType.ACTIVE_LEARNING) {
        this.codeFormCtrl.setValue(informationSource.sourceCode.replace(this.getClassLine(), this.getClassLine(this.informationSource.name)));
      }
      else this.codeFormCtrl.setValue(informationSource.sourceCode);
      if (this.isInitialLf == null) this.isInitialLf = InformationSourceCodeLookup.isCodeStillTemplate(this.informationSource.sourceCode) != null;
    }
    this.checkLogs(projectId, informationSource);

  }
  openBricksIntegrator() {
    document.getElementById('bricks-integrator-open-button').click();
  }

  checkLogs(projectId: string, informationSource: any) {
    if (informationSource.lastTask) {
      [this.lastTaskQuery$, this.lastTask$] = this.informationSourceApolloService.getTaskByTaskId(
        projectId,
        informationSource.lastTask.id
      );
      if ((!this.displayLogWarning || !this.lastTaskLogs || this.lastTaskLogs.length == 0)) {
        this.lastTask$.pipe(first()).subscribe((task) => this.lastTaskLogs = task.logs);
      }
    } else {
      this.lastTask$ = null;
    }
  }

  prepareEmbeddingsRequest(projectId: string) {
    let vc;
    [this.embeddingQuery$, vc] = this.projectApolloService.getEmbeddingSchema(projectId);
    this.subscriptions$.push(vc.subscribe(embeddings => {
      this.embeddings = embeddings;
      this.filterEmbeddingsForCurrentTask();
    }
    ));
    return vc.pipe(first());
  }

  prepareKnowledgeRequest(projectId: string) {
    let vc;
    [this.knowledgeBasesQuery$, vc] = this.knowledgeBaseApollo.getKnowledgeBasesByProjectId(projectId);
    this.subscriptions$.push(vc.subscribe(bases => this.knowledgeBases = bases));
    return vc.pipe(first());
  }


  filterEmbeddingsForCurrentTask() {
    if (!this.embeddings || !this.labelingTasks.size || !this.labelingTaskControl.value) return;
    this.embeddingsFiltered = [];
    const onlyAttribute = this.labelingTasks.get(this.labelingTaskControl.value).taskType == LabelingTask.MULTICLASS_CLASSIFICATION

    for (const e of this.embeddings) {
      if ((e.type == 'ON_ATTRIBUTE' && onlyAttribute) || (e.type != 'ON_ATTRIBUTE' && !onlyAttribute)) {
        this.embeddingsFiltered.push(e);
      }
    }
  }

  checkTemplateCodeChange() {
    if (!this.informationSource || this.labelingTasks.size == 0) return;
    const template: InformationSourceExamples = InformationSourceCodeLookup.isCodeStillTemplate(this.informationSource.sourceCode);
    if (template != null) {
      const templateCode = this.getInformationSourceTemplate(this.informationSource.informationSourceType).code;
      if (this.informationSource.informationSourceType == InformationSourceType.LABELING_FUNCTION) {
        this.codeFormCtrl.setValue(templateCode.replace(
          'def lf(record',
          'def ' + this.informationSource.name + '(record'
        ));
      } else if (this.informationSource.informationSourceType == InformationSourceType.ACTIVE_LEARNING) {
        this.codeFormCtrl.setValue(templateCode.replace(this.getClassLine(), this.getClassLine(this.informationSource.name)));
      }
      else this.codeFormCtrl.setValue(templateCode);
    }
  }

  getInformationSourceTemplate(type: InformationSourceType): any {

    const firstLabelingTaskType = this.labelingTasks.get(this.labelingTaskControl.value).taskType;

    let templateKey: InformationSourceExamples;
    if (type == InformationSourceType.LABELING_FUNCTION) {
      templateKey = firstLabelingTaskType == LabelingTask.INFORMATION_EXTRACTION ? InformationSourceExamples.LF_EMPTY_EXTRACTION : InformationSourceExamples.LF_EMPTY_CLASSIFICATION;
    }
    else {
      templateKey = firstLabelingTaskType == LabelingTask.INFORMATION_EXTRACTION ? InformationSourceExamples.AL_EMPTY_EXTRACTION : InformationSourceExamples.AL_EMPTY_CLASSIFICATION;
    }
    return InformationSourceCodeLookup.getInformationSourceTemplate(templateKey);
  }



  initEditor(editor, projectId) {
    this.codeFormCtrl.valueChanges
      .pipe(
        debounceTime(2000), //5 sec
        distinctUntilChanged(),
        startWith('')
      )
      .subscribe(() => {
        if (this.hasUnsavedChanges()) {
          this.saveInformationSource(projectId);
        }
      });
  }
  copyClicked: Number = -1;
  copyToClipboard(textToCopy, i = -1) {
    navigator.clipboard.writeText(textToCopy);
    if (i != -1) {
      this.copyClicked = i;
      timer(1000).pipe(first()).subscribe(() => {
        this.copyClicked = -1;
      })
    }
  }

  deleteInformationSource() {
    this.informationSourceApolloService
      .deleteInformationSource(this.project.id, this.informationSource.id).pipe(first())
      .subscribe();
    this.router.navigate(["../"], { relativeTo: this.activatedRoute });
  }


  runInformationSource(projectId) {
    if (this.requestTimeOut) return;
    if (this.hasUnsavedChanges()) {
      console.log('Unsaved changes -- aborted!');
      return;
    }
    this.justClickedRun = true;
    this.informationSourceApolloService
      .createTask(projectId, this.informationSource.id)
      .pipe(first()).subscribe();
    this.requestTimeOut = true;
    this.displayLogWarning = false;
    timer(1000).subscribe(() => this.requestTimeOut = false);
  }

  runInformationSourceAndWeaklySupervise(projectId: string) {
    this.informationSourceApolloService.runHeuristicThenTriggerWeakSupervision(
      projectId, this.informationSource.id, this.informationSource.labelingTaskId
    ).pipe(first()).subscribe();
  }

  saveInformationSource(projectId) {
    if (this.updatedThroughWebsocket) return;
    if (!this.informationSource$) {
      console.log('nothing to save');
      return;
    }
    const sourceType = this.informationSource.informationSourceType;
    const sourceId = this.informationSource.id;

    if (sourceType == InformationSourceType.LABELING_FUNCTION || sourceType == InformationSourceType.ACTIVE_LEARNING) {
      let functionName: string = this.informationSourceName;
      if (sourceType == InformationSourceType.LABELING_FUNCTION) {
        functionName = getPythonFunctionName(this.codeFormCtrl.value);
      } else {
        functionName = getPythonClassName(this.codeFormCtrl.value);
      }
      if (functionName == '@@unknown@@') {
        console.log(
          "Can't find python function name -- seems wrong -- better dont save"
        );
        return;
      }
      this.informationSourceApolloService
        .updateInformationSource(
          projectId,
          sourceId,
          this.labelingTaskControl.value,
          this.getPythonFunctionToSave(this.codeFormCtrl.value),
          this.description,
          functionName
        ).pipe(first())
        .subscribe();
    } else {
      console.log('currently not possible for type ' + sourceType);
      return;
    }
  }

  setFocus(focusArea) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }
  openDescription(open: boolean, projectId) {
    this.descriptionOpen = open;
    if (!open && this.description != this.informationSource.description) {
      this.saveInformationSource(projectId);
    }
  }

  isDescriptionOpen(): boolean {
    return this.descriptionOpen;
  }

  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
  }
  openName(open: boolean, projectId) {
    const sourceType = this.informationSource.informationSourceType;
    this.nameOpen = open;
    if (!open && this.informationSourceName != this.informationSource.name) {
      if (sourceType == InformationSourceType.LABELING_FUNCTION) {
        //change name in code:
        var regMatch: any = getPythonFunctionRegExMatch(this.codeFormCtrl.value);
        if (!regMatch) return;
        this.codeFormCtrl.setValue(this.codeFormCtrl.value.replace(
          regMatch[0],
          'def ' + this.informationSourceName + '(record)'
        ));
      } else if (this.informationSource.informationSourceType == InformationSourceType.ACTIVE_LEARNING) {
        var regMatch: any = getPythonClassRegExMatch(this.codeFormCtrl.value);
        if (!regMatch) return;

        this.codeFormCtrl.setValue(this.codeFormCtrl.value.replace(regMatch[0], this.getClassLine(this.informationSourceName)));
      }

      //save data
      this.saveInformationSource(projectId);
    }
  }

  isNameOpen(): boolean {
    return this.nameOpen;
  }

  hasUnsavedChanges(): boolean {
    if (!this.informationSource) return false;
    if (this.updatedThroughWebsocket) return false;

    if (this.description != this.informationSource.description) return true;
    if (this.informationSourceName != this.informationSource.name) return true;
    if (this.labelingTaskControl.value != this.informationSource.labelingTaskId) return true;
    if (this.informationSource.informationSourceType == InformationSourceType.LABELING_FUNCTION) {
      if (
        this.codeFormCtrl.value !=
        this.informationSource.sourceCode.replace(
          'def lf(record',
          'def ' + this.informationSource.name + '(record'
        )
      )
        return true;
    } else if (this.informationSource.informationSourceType == InformationSourceType.ACTIVE_LEARNING) {
      if (this.codeFormCtrl.value !=
        this.informationSource.sourceCode.replace(this.getClassLine(), this.getClassLine(this.informationSource.name))) return true;
    } else {
      if (this.codeFormCtrl.value != this.informationSource.sourceCode) return true;
    }
    return false;
  }

  changeInformationSourceName(event) {
    // if (this.informationSource.informationSourceType != InformationSourceType.LABELING_FUNCTION) return;
    this.informationSourceName = toPythonFunctionName(event.target.value);
    if (this.informationSourceName != event.target.value) {
      event.target.value = this.informationSourceName;
    }
    this.isHeaderNormal = true;
  }

  getPythonFunctionToSave(codeToSave: string): string {
    if (codeToSave.includes('\t')) {
      console.log(
        'Function code holds tab characters -- replaced with 4 spaces to prevent unwanted behaviour'
      );
      codeToSave = codeToSave.replace(/\t/g, '    ');
      this.codeFormCtrl.setValue(this.codeFormCtrl.value.replace(/\t/g, '    '));
    }
    if (this.informationSource.informationSourceType == InformationSourceType.LABELING_FUNCTION) {
      var regMatch: any = getPythonFunctionRegExMatch(codeToSave);
      if (!regMatch) return codeToSave;

      return codeToSave.replace(regMatch[0], 'def lf(record)');

    } else if (this.informationSource.informationSourceType == InformationSourceType.ACTIVE_LEARNING) {
      var regMatch: any = getPythonClassRegExMatch(codeToSave);
      if (!regMatch) return codeToSave;

      return codeToSave.replace(regMatch[0], this.getClassLine());
    }
    return codeToSave;
  }

  getClassLine(className: string = null): string {

    const taskType = this.labelingTasks.get(this.labelingTaskControl.value).taskType;
    if (!className) className = taskType == LabelingTask.INFORMATION_EXTRACTION ? 'ATLExtractor' : 'ATLClassifier';
    className += taskType == LabelingTask.INFORMATION_EXTRACTION ? '(LearningExtractor):' : '(LearningClassifier):';
    return 'class ' + className;
  }



  getInformationSourceTypeString(type: InformationSourceType) {
    return informationSourceTypeToString(type, false, true);
  }

  setValueToLabelingTask(value) {
    this.labelingTaskControl.setValue(value);
    if (this.bricksIntegrator) this.bricksIntegrator.selectDifferentTask(value);
  }

  getBackground(color) {
    return `bg-${color}-100`
  }

  getText(color) {
    return `text-${color}-700`
  }

  getBorder(color) {
    return `border-${color}-400`
  }

  getHover(color) {
    return `hover:bg-${color}-200`
  }

  prepareAttributes(projectId: string) {
    let attributes$;
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId);
    this.subscriptions$.push(attributes$.subscribe((attributes) => {
      this.attributesView = attributes.filter((a) => a.visibility != AttributeVisibility.HIDE);
      attributes.sort((a, b) => a.relativePosition - b.relativePosition);
      this.attributes = attributes;
      this.attributes.forEach(attribute => {
        attribute.color = getColorForDataType(attribute.dataType);
        attribute.dataTypeName = this.dataTypesArray.find((type) => type.value === attribute.dataType).name;
      });
      this.attributeDetails = Object.fromEntries(this.attributesView.map((attribute) => [attribute.id, attribute]));
    }));
    return attributes$.pipe(first());
  }

  getLabelingFunctionOn10Records(projectId: string) {
    if (this.requestTimeOut) return;
    if (this.hasUnsavedChanges()) {
      console.log('Unsaved changes -- aborted!');
      return;
    }
    this.justClickedRun = true;
    this.informationSourceApolloService.getLabelingFunctionOn10Records(projectId, this.informationSource.id).pipe(first()).subscribe((sampleRecords) => {
      this.displayLogWarning = true;
      this.sampleRecords = sampleRecords;
      this.sampleRecords.records.forEach(record => {
        record.fullRecordData = JSON.parse(record.fullRecordData);
        if (this.labelingTasks.get(this.labelingTaskControl.value).taskType == 'MULTICLASS_CLASSIFICATION') {
          const label = record.calculatedLabels.length > 0 ? record.calculatedLabels[1] : '-';
          record.calculatedLabelsResult = {
            label: {
              label: label,
              color: this.getColorForLabel(label),
              count: 1,
              displayAmount: false
            }
          };
        } else {
          const resultDict = {};
          if (record.calculatedLabels.length > 0) {
            record.calculatedLabels.forEach(e => {
              const label = this.getLabelFromExtractionResult(e);
              if (!resultDict[label]) {
                resultDict[label] = {
                  label: label,
                  color: this.getColorForLabel(label),
                  count: 0
                };
              }
              resultDict[label].count++;
            });
            const displayAmount = Object.keys(resultDict).length > 1;
            for (const key in resultDict) {
              resultDict[key].displayAmount = displayAmount || resultDict[key].count > 1;
            }
          } else {
            resultDict['-'] = {
              label: '-',
              color: this.getColorForLabel('-'),
              count: 1
            };
          }
          record.calculatedLabelsResult = resultDict;
        }
      });
      this.lastTaskLogs = this.sampleRecords.containerLogs;
      this.justClickedRun = false;
    });
    this.requestTimeOut = true;
    timer(1000).subscribe(() => this.requestTimeOut = false);
  }

  getColorForLabel(label: string) {
    return label != '-' ? this.getTargetTaskLabels().find(el => el.name == label)?.color : 'gray';
  }

  getLabelFromExtractionResult(str: string) {
    const array = str.split('\'');
    return array.length == 1 ? array[0] : array[1];
  }


  copyImportToClipboard(pythonVariable: string) {
    const statement = "from knowledge import " + pythonVariable;
    navigator.clipboard.writeText(statement);
  }

  onScrollEvent(event: Event) {
    if (!(event.target instanceof HTMLElement)) return;
    if ((event.target as HTMLElement).scrollTop > 0) {
      this.isHeaderNormal = false;
    } else {
      this.isHeaderNormal = true;
    }
  }
}
