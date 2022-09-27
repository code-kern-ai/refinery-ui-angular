import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { InformationSourceType, LabelingTask, LabelSource } from 'src/app/base/enum/graphql-enums';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { UserManager } from 'src/app/util/user-manager';

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

  project: any;
  informationSources$: any;
  informationSourcesQuery$: any;

  subscriptions$: Subscription[] = [];
  labelingTasks;
  labelingTasksClassification;
  labelingTasksQuery$: any;

  modalOpen: boolean = false;
  selectedInformationSources = [];
  informationSourcesArray = [];
  filteredSourcesList = [];

  openTab: number = -1;
  functionName: string = '';
  labelingTaskId: any;
  description: string;
  selectionList: string = "";
  @ViewChild("deleteSelectedHeuristics") deleteSelectedHeuristics: ElementRef;

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private informationSourceApolloService: WeakSourceApolloService
  ) { }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.projectApolloService.getProjectById(projectId).pipe(first()).subscribe(project => this.project = project);

    [this.informationSourcesQuery$, this.informationSources$] = this.informationSourceApolloService.getModelCallbacksOverviewData(projectId);
    this.subscriptions$.push(this.informationSources$.subscribe((sources) => {
      this.selectedInformationSources = sources.filter((i) => i.selected);
      this.informationSourcesArray = sources;
      const currentTaskFilter = this.labelingTasks && this.openTab != -1 ? this.labelingTasks[this.openTab] : null;
      this.toggleTabs(this.openTab, currentTaskFilter);
    }));
    this.prepareLabelingTasks(projectId);
    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['information_source_created', 'information_source_updated', 'information_source_deleted'];
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created', 'model_callback_update_statistics']);
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
      labelIds.push("-");
      if (this.labelingTasks.length > 0) this.labelingTaskId = this.labelingTasks[0].id;
    }));
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
    if (['information_source_created', 'information_source_updated', 'information_source_deleted', 'model_callback_update_statistics']) {
      this.informationSourcesQuery$.refetch();
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
