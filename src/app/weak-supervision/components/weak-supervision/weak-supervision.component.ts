import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { InformationSourceType, LabelingTask, LabelSource } from 'src/app/base/enum/graphql-enums';
import { ConfigManager } from 'src/app/base/services/config-service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { UserManager } from 'src/app/util/user-manager';
import { InformationSourceCodeLookup, InformationSourceExamples } from '../information-sources-code-lookup';

@Component({
  selector: 'kern-weak-supervision',
  templateUrl: './weak-supervision.component.html',
  styleUrls: ['./weak-supervision.component.scss'],
})
export class WeakSupervisionComponent implements OnInit, OnDestroy {
  get LabelSourceType(): typeof LabelSource {
    return LabelSource;
  }
  get InformationSourceType(): typeof InformationSourceType {
    return InformationSourceType;
  }

  @ViewChild('inputConfig', { read: ElementRef }) inputConfig: ElementRef;
  @ViewChild('attributesSelect', { read: ElementRef }) attributesSelect: ElementRef;
  @ViewChild('labelingTasksSelect', { read: ElementRef }) labelingTasksSelect: ElementRef;

  project: any;
  informationSources$: any;
  informationSourcesQuery$: any;

  currentWeakSupervisionRun$: any;
  currentWeakSupervisionRunQuery$: any;
  currentWeakSupervisionRun: any;
  subscriptions$: Subscription[] = [];
  labelingTasks;
  labelingTasksClassification;
  labelingTasksQuery$: any;
  attributes;
  attributesQuery$: any;
  hideZeroShotAttribute: boolean = null;
  zeroShotRecommendations: any;
  currentRecommendation: any;
  requestTimeOut: boolean = false;
  justClickedRun: boolean = false;
  modalOpen: boolean = false;
  selectedInformationSources = [];
  informationSourcesArray = [];
  filteredSourcesList = [];


  confidenceControl = new FormControl(0.01);
  confidenceList = [
    { name: 'Hit rate optimized', value: 0.01 },
    { name: 'Balance Optimized', value: 0.1 },
    { name: 'Quality Optimized', value: 0.2 },
  ];
  enoughInformationSources = false;
  openTab: number = -1;
  functionName: string = '';
  embeddings: any;
  embeddingsFiltered: any;
  labelingTaskId: any;
  embedding: string;
  embeddingQuery$: any;
  description: string;
  selectionList: string = "";
  isManaged: boolean = false;
  @ViewChild("modalCreateLF") modalCreateLF: ElementRef;
  @ViewChild("modalCreateAL") modalCreateAL: ElementRef;
  @ViewChild("modalCreateZS") modalCreateZS: ElementRef;
  @ViewChild("modalCreateCL") modalCreateCL: ElementRef;

  @ViewChild("deleteSelectedHeuristics") deleteSelectedHeuristics: ElementRef;
  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  downloadedModels: any[];

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private informationSourceApolloService: WeakSourceApolloService,
  ) { }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.projectApolloService.getProjectById(projectId).pipe(first()).subscribe(project => this.project = project);

    [this.informationSourcesQuery$, this.informationSources$] = this.informationSourceApolloService.getInformationSourcesOverviewData(projectId);
    this.subscriptions$.push(this.informationSources$.subscribe((sources) => {
      this.justClickedRun = false;
      this.selectedInformationSources = sources.filter((i) => i.selected);
      this.informationSourcesArray = sources;
      this.informationSourcesArray.forEach(s => {
        if (s.informationSourceType == 'ZERO_SHOT') s.routerLink = '../zero-shot/' + s.id;
        else if (s.informationSourceType == 'CROWD_LABELER') s.routerLink = '../crowd-labeler/' + s.id;
        else s.routerLink = './' + s.id
      })
      const currentTaskFilter = this.labelingTasks && this.openTab != -1 ? this.labelingTasks[this.openTab] : null;
      this.toggleTabs(this.openTab, currentTaskFilter);
    }));
    this.prepareLabelingTasks(projectId);
    this.prepareAttributes(projectId);
    this.prepareZeroShotRecommendations(projectId);
    this.prepareCurrentWeakSupervisionInfo(projectId);
    this.prepareEmbeddingsRequest(projectId);

    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.informationSourceApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => this.downloadedModels = downloadedModels));

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
    this.setUpCommentRequests(projectId);
    this.checkIfManagedVersion();
  }
  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.HEURISTIC, projectId: projectId });
    requests.push({ commentType: CommentType.EMBEDDING, projectId: projectId });
    requests.push({ commentType: CommentType.LABEL, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  checkIfManagedVersion() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfManagedVersion());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }

  prepareCurrentWeakSupervisionInfo(projectId: string) {
    [this.currentWeakSupervisionRunQuery$, this.currentWeakSupervisionRun$] = this.projectApolloService.getCurrentWeakSupervisionRun(projectId);
    this.subscriptions$.push(this.currentWeakSupervisionRun$.subscribe((run) => {
      if (run == null) {
        this.currentWeakSupervisionRun = { state: "NOT_YET_RUN" };
      } else {
        this.currentWeakSupervisionRun = run;
        if (run.user.firstName) this.currentWeakSupervisionRun.displayName = run.user.firstName[0] + '. ' + run.user.lastName;
        else this.currentWeakSupervisionRun.displayName = "Unknown";
        this.currentWeakSupervisionRun.createdAtDisplay = this.parseUTC(this.currentWeakSupervisionRun.createdAt);
        if (this.currentWeakSupervisionRun.finishedAt) {
          this.currentWeakSupervisionRun.finishedAtDisplay = this.parseUTC(this.currentWeakSupervisionRun.finishedAt);
        } else {
          this.currentWeakSupervisionRun.finishedAtDisplay = "Not finished";
        }
      }
    }));

  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['information_source_created', 'information_source_updated', 'information_source_deleted'];
    toReturn.push(...['payload_finished', 'payload_failed', 'payload_created', 'payload_update_statistics']);
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
    toReturn.push(...['weak_supervision_started', 'weak_supervision_finished']);
    toReturn.push(...['embedding_deleted', 'embedding']);
    return toReturn;
  }

  prepareLabelingTasks(projectId: string) {
    let vc;
    [this.labelingTasksQuery$, vc] = this.projectApolloService.getLabelingTasksByProjectId(projectId);
    this.subscriptions$.push(vc.subscribe((tasks) => {
      tasks.sort((a, b) => a.relativePosition - b.relativePosition || a.name.localeCompare(b.name))
      this.labelingTasks = tasks;
      this.labelingTasksClassification = tasks.filter(t => t.taskType == LabelingTask.MULTICLASS_CLASSIFICATION)
      let labelIds = [];
      tasks.forEach((task) => {
        labelIds.push(...task.labels.map((label) => label.id));
      });
      if (this.labelingTasksClassification.length) {
        this.hideZeroShotAttribute = this.labelingTasksClassification[0].taskTarget == 'ON_ATTRIBUTE'
      }
      labelIds.push("-");
      if (this.labelingTasks.length > 0) this.labelingTaskId = this.labelingTasks[0].id;
    }));
  }


  prepareAttributes(projectId: string) {
    let attributes$;
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId);;
    this.subscriptions$.push(attributes$.subscribe((attributes) => this.attributes = attributes.filter(a => a.dataType == 'TEXT')));
  }

  prepareZeroShotRecommendations(projectId: string) {
    let q, vc;
    [q, vc] = this.informationSourceApolloService.getZeroShotRecommendations(projectId);
    vc.pipe(first()).subscribe((r) => {
      if (r) r.forEach(e => e.hidden = false);
      r.sort((a, b) => a.prio - b.prio);
      this.zeroShotRecommendations = r;
    });

  }

  toggleInformationSource(projectId: string, informationSourceId: string) {
    this.informationSourceApolloService
      .toggleInformationSourceSelected(projectId, informationSourceId).pipe(first())
      .subscribe()
  }

  runSelectedInformationSources(projectId: string) {
    this.selectedInformationSources.forEach(el => {
      if (this.canStartISRun(el)) {
        this.runInformationSource(projectId, el.id, el.informationSourceType, true);
      }
    })
  }

  runInformationSource(projectId: string, informationSourceId: string, type: string, force: boolean = false) {
    if (this.requestTimeOut && !force) return;
    this.justClickedRun = true;
    if (type == InformationSourceType.ZERO_SHOT) {
      this.informationSourceApolloService.runZeroShotProject(projectId, informationSourceId).pipe(first()).subscribe();
    } else {
      this.informationSourceApolloService
        .createTask(projectId, informationSourceId)
        .pipe(first()).subscribe()

    }
    this.requestTimeOut = true;
    timer(500).subscribe(() => this.requestTimeOut = false);
  }

  deleteSelectedInformationSources(projectId: string) {
    this.selectedInformationSources.forEach(el => {
      this.deleteInformationSource(projectId, el.id);
    })
  }

  deleteInformationSource(projectId: string, informationSourceId: string) {
    this.informationSourceApolloService
      .deleteInformationSource(projectId, informationSourceId).pipe(first())
      .subscribe();
  }

  getInformationSourceTemplate(type: InformationSourceType, embedding: string): any {
    const matching = this.labelingTasks.filter(e => e.id == this.labelingTaskId)
    if (matching.length != 1) return null;
    const firstLabelingTaskType = matching[0].taskType;
    let tmplateKey: InformationSourceExamples;
    let replaceEmbedding = false;
    if (type == InformationSourceType.LABELING_FUNCTION) {
      tmplateKey = firstLabelingTaskType == LabelingTask.INFORMATION_EXTRACTION ? InformationSourceExamples.LF_EMPTY_EXTRACTION : InformationSourceExamples.LF_EMPTY_CLASSIFICATION;
    }
    else {
      tmplateKey = firstLabelingTaskType == LabelingTask.INFORMATION_EXTRACTION ? InformationSourceExamples.AL_EMPTY_EXTRACTION : InformationSourceExamples.AL_EMPTY_CLASSIFICATION;
      replaceEmbedding = true;
    }
    const code = InformationSourceCodeLookup.getInformationSourceTemplate(tmplateKey);
    if (replaceEmbedding) {
      code.code = code.code.replace("@@EMBEDDING@@", embedding)
    }
    return code;
  }

  createInformationSource(projectId: string, type: InformationSourceType) {
    if (type == InformationSourceType.LABELING_FUNCTION || type == InformationSourceType.ACTIVE_LEARNING) {
      const codeData = this.getInformationSourceTemplate(type, this.embedding);
      if (!codeData) return;
      const descriptionToUse = this.description ? this.description : 'provide some description for documentation'
      this.informationSourceApolloService
        .createInformationSource(
          projectId,
          this.labelingTaskId,
          this.functionName,
          descriptionToUse,
          codeData.code,
          type
        )
        .subscribe((re) => {
          let id =
            re['data']?.['createInformationSource']?.['informationSource']?.[
            'id'
            ];
          if (id) {
            this.router.navigate([id], {
              relativeTo: this.activatedRoute,
              queryParams: { type: type },
            });
          } else {
            console.log("can't find newly created id for " + type + " --> can't open");
          }
        });
    } else {
      console.log('currently only possible to create labeling functions & classification');
    }
  }
  createCrowdLabelerInformationSource(projectId: string) {
    this.informationSourceApolloService
      .createInformationSource(
        projectId,
        this.labelingTaskId,
        this.functionName,
        this.description,
        "",
        InformationSourceType.CROWD_LABELER
      )
      .subscribe((re) => {
        const id = re['data']?.['createInformationSource']?.['informationSource']?.['id'];
        if (id) {
          this.router.navigate(["../crowd-labeler/" + id], {
            relativeTo: this.activatedRoute,
          });
        } else {
          console.log("can't find newly created id for CROWD_LABELER --> can't open");
        }
      });

  }
  createZeroShotInformationSource(projectId: string) {
    const targetConfig = this.inputConfig.nativeElement.value;
    const labelingTaskId = this.labelingTasksSelect.nativeElement.options[this.labelingTasksSelect.nativeElement.selectedIndex].value;
    if (!labelingTaskId) return;
    const attributeId = this.hideZeroShotAttribute ? '' : this.attributesSelect.nativeElement.options[this.attributesSelect.nativeElement.selectedIndex].value;
    if (!targetConfig) return;
    this.informationSourceApolloService
      .createZeroShotInformationSource(
        projectId,
        targetConfig,
        labelingTaskId,
        attributeId,
      )
      .subscribe((re) => {
        const id = re['data']?.['createZeroShotInformationSource']['id'];
        if (id) {
          this.router.navigate(["../zero-shot/" + id], {
            relativeTo: this.activatedRoute,
          });
        } else {
          console.log("can't find newly created id for ZERO_SHOT --> can't open");
        }
      });

  }

  setCurrentRecommendation(recommendation: any, hoverBox: HTMLElement, listElement: HTMLElement) {
    this.currentRecommendation = recommendation;
    if (recommendation) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  selectFirstUnhiddenRecommendation(inputElement: HTMLInputElement) {
    for (let recommendation of this.zeroShotRecommendations) {
      if (!recommendation.hidden) {
        this.selectRecommendation(recommendation, inputElement);
        return;
      }
    }

  }

  selectRecommendation(recommendation: any, inputElement: HTMLInputElement) {
    inputElement.value = recommendation.configString;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkRecommendation(inputElement);
  }

  checkRecommendation(eventTarget: HTMLInputElement) {
    const lowerEventValue = eventTarget.value.toLowerCase();
    for (let recommendation of this.zeroShotRecommendations) {
      recommendation.hidden = !recommendation.configString.toLowerCase().includes(lowerEventValue)
    }
  }

  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
  }

  areInformationSourcesSelected(informationSources: any[], onlyValid: boolean) {
    const selected = informationSources.filter((i) => i.selected).length;
    if (onlyValid) {
      const selectedFinished = informationSources.filter((i) => i.selected && ['FINISHED', 'STARTED'].includes(i?.state)).length;
      return selected > 0 && selected == selectedFinished;
    }
    return selected > 0;
  }
  canStartISRun(informationSource: any): boolean {
    if (!informationSource) return false;
    if (!informationSource.state || informationSource?.state == 'FAILED' || informationSource?.state == 'FINISHED') return true;
    const d: Date = dateAsUTCDate(new Date(informationSource.lastRun));
    const current: Date = new Date();
    if (d.getTime() - current.getTime() > 600000) return true; // older than 10 min
    return false;
  }


  startWeakSupervision(projectId: string) {
    this.currentWeakSupervisionRun = null;
    this.informationSourceApolloService
      .triggerWeakSupervision(projectId).pipe(first()).subscribe();
  }

  aggregateStats(stat: any) {
    const positives = stat['True Positives'] + stat['False Positives'];
    return positives > 0 ? Math.round(stat['True Positives'] / positives * 10000) / 10000 : 0;
  }

  handleWebsocketNotification(msgParts: string[]) {
    if (['labeling_task_updated', 'labeling_task_created'].includes(msgParts[1])) {
      this.labelingTasksQuery$.refetch();
    }
    if ('labeling_task_deleted' == msgParts[1]) {
      this.labelingTasksQuery$.refetch();
      this.informationSourcesQuery$.refetch();
    }
    if (['information_source_created', 'information_source_updated', 'information_source_deleted', 'payload_finished', 'payload_failed', 'payload_created', 'payload_update_statistics']) {
      this.informationSourcesQuery$.refetch();
    }
    if (['weak_supervision_started', 'weak_supervision_finished'].includes(msgParts[1])) {
      this.currentWeakSupervisionRun = null;
      this.currentWeakSupervisionRunQuery$.refetch();
    }
    if (msgParts[1] == 'embedding_deleted' || (msgParts[1] == 'embedding' && msgParts[3] == 'state')) {
      if (this.embeddingQuery$) this.embeddingQuery$.refetch();
    }
  }

  modalChangeForCreation(checked: boolean, type: string) {
    if (checked) {
      this.description = "provide some description for documentation";

      if (this.labelingTasks.length > 0) this.labelingTaskId = this.labelingTasks[0].id;
      if (type == InformationSourceType.LABELING_FUNCTION)
        this.functionName = "my_labeling_function";
      else if (type == InformationSourceType.ACTIVE_LEARNING) {
        this.functionName = "MyActiveLearner";
        this.filterEmbeddingsForCurrentTask();
      } else if (type == InformationSourceType.CROWD_LABELER) {
        this.functionName = "Crowd Heuristic";
      }
      else this.functionName = "Zero shot module";
    }
  }

  toggleTabs(index: number, labelingTask: any) {
    this.openTab = index;
    this.filteredSourcesList = labelingTask !== null
      ? this.filteredSourcesList = this.informationSourcesArray.filter(source => source.labelingTaskId == labelingTask.id)
      : this.informationSourcesArray;
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

  getHeightInPx(stats) {
    const numLabels = stats[0].label == '-' ? 0 : stats.length;
    const numLabelsPx = (numLabels * 70) + "px";
    let additionalPx = 0 + "px";
    if (stats.length > 3) additionalPx = 20 + "px";
    return parseInt("88px", 10) + parseInt(numLabelsPx, 10) + parseInt(additionalPx, 10) + "px";
  }

  setAllInformationSources(value: boolean) {
    this.informationSourceApolloService.setAllInformationSources(this.project.id, value)
      .pipe(first())
      .subscribe();
  }

  prepareEmbeddingsRequest(projectId: string) {
    let vc;
    [this.embeddingQuery$, vc] = this.projectApolloService.getEmbeddingSchema(projectId);
    this.subscriptions$.push(vc.subscribe(embeddings => {
      this.embeddings = embeddings;
      this.filterEmbeddingsForCurrentTask();
    }
    ));
    return vc;
  }

  filterEmbeddingsForCurrentTask() {
    this.embeddingsFiltered = [];
    if (!this.embeddings || !this.labelingTaskId) return;
    const matching = this.labelingTasks.filter(e => e.id == this.labelingTaskId)
    if (matching.length != 1) return;
    const onlyAttribute = matching[0].taskType === LabelingTask.MULTICLASS_CLASSIFICATION

    for (const e of this.embeddings) {
      if ((e.type == 'ON_ATTRIBUTE' && onlyAttribute) || (e.type != 'ON_ATTRIBUTE' && !onlyAttribute)) {
        this.embeddingsFiltered.push(e);
      }
    }
    this.embedding = this.embeddingsFiltered.length !== 0 ? this.embeddingsFiltered[0].name : '';
  }

  changeInformationSourceName(event) {
    this.functionName = this.toPythonFunctionName(event.target.value);
    if (this.functionName != event.target.value) {
      event.target.value = this.functionName;
    }
  }

  toPythonFunctionName(str: string) {
    return str.replace(/\s+/g, '_').replace(/[^\w]/gi, '').trim();
  }

  prepareSelectionList() {
    this.selectionList = "";
    this.selectedInformationSources.forEach(el => {
      if (this.selectionList) this.selectionList += "\n";
      this.selectionList += el.name;
    })

  }

  navigateToSettings() {
    localStorage.setItem("openModal", "true");
    this.router.navigate(["../settings"], {
      relativeTo: this.activatedRoute,
    });
  }

  executeOption(value: string) {
    switch (value) {
      case 'Labeling function':
        this.modalCreateLF.nativeElement.checked = true;
        this.modalChangeForCreation(true, InformationSourceType.LABELING_FUNCTION);
        break;
      case 'Active learning':
        this.modalCreateAL.nativeElement.checked = true;
        this.modalChangeForCreation(true, InformationSourceType.ACTIVE_LEARNING);
        break;
      case 'Zero-shot':
        this.modalCreateZS.nativeElement.checked = true;
        this.modalChangeForCreation(true, InformationSourceType.ZERO_SHOT)
        break;
      case 'Crowd labeling':
        this.modalCreateCL.nativeElement.checked = true;
        this.modalChangeForCreation(true, InformationSourceType.CROWD_LABELER)
        break;

      case 'Select all':
        this.setAllInformationSources(true);
        break;
      case 'Deselect all':
        this.setAllInformationSources(false);
        break;
      case 'Run selected':
        this.runSelectedInformationSources(this.project.id);
        break;
      case 'Delete selected':
        this.deleteSelectedHeuristics.nativeElement.checked = true;
        this.prepareSelectionList();
        break;
    }
  }

  checkIfModelIsDownloaded(modelName: string) {
    const findModel = this.downloadedModels && this.downloadedModels.find(el => el.name === modelName);
    return findModel !== undefined ? true : false;
  }
}
