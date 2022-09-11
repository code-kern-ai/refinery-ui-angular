import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { InformationSourceType, LabelingTask, LabelingTaskTarget, LabelSource } from 'src/app/base/enum/graphql-enums';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';

@Component({
  selector: 'model-callbacks',
  templateUrl: './model-callbacks.component.html',
  styleUrls: ['./model-callbacks.component.scss'],
})
export class ModelCallbackComponent implements OnInit, OnDestroy {
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
  @ViewChild("modalCreateLF") modalCreateLF: ElementRef;
  @ViewChild("modalCreateAL") modalCreateAL: ElementRef;
  @ViewChild("modalCreateZS") modalCreateZS: ElementRef;
  @ViewChild("deleteSelectedHeuristics") deleteSelectedHeuristics: ElementRef;
  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  downloadedModels: any[];

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private informationSourceApolloService: WeakSourceApolloService
  ) { }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.project.sid);
  }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.projectApolloService.getProjectById(projectId).pipe(first()).subscribe(project => this.project = project);

    [this.informationSourcesQuery$, this.informationSources$] = this.informationSourceApolloService.getModelCallbacksOverviewData(projectId);
    this.subscriptions$.push(this.informationSources$.subscribe((sources) => {
      this.justClickedRun = false;
      this.selectedInformationSources = sources.filter((i) => i.selected);
      this.informationSourcesArray = sources;
      const currentTaskFilter = this.labelingTasks && this.openTab != -1 ? this.labelingTasks[this.openTab] : null;
      this.toggleTabs(this.openTab, currentTaskFilter);
    }));
    this.prepareLabelingTasks(projectId);
    this.prepareAttributes(projectId);
    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.informationSourceApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => this.downloadedModels = downloadedModels));

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
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

  toggleInformationSource(projectId: string, informationSourceId: string) {
    this.informationSourceApolloService
      .toggleInformationSourceSelected(projectId, informationSourceId).pipe(first())
      .subscribe()
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


  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
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
    this.informationSourceApolloService.setAllModelCallbacks(this.project.id, value)
      .pipe(first())
      .subscribe();
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
      case 'Select all':
        this.setAllInformationSources(true);
        break;
      case 'Deselect all':
        this.setAllInformationSources(false);
        break;
      case 'Delete selected':
        this.deleteSelectedHeuristics.nativeElement.checked = true;
        this.prepareSelectionList();
        break;
    }
  }
}
