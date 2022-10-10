import {
  Component,
  OnDestroy,
  OnInit,
  ViewChildren,
  ViewChild,
  ElementRef,
  AfterViewInit,
  QueryList,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';

import { combineLatest, forkJoin, Subscription, timer } from 'rxjs';
import { InformationSourceType, informationSourceTypeToString, LabelingTask, LabelSource } from 'src/app/base/enum/graphql-enums';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { NotificationService } from 'src/app/base/services/notification.service';
import { schemeCategory24 } from 'src/app/util/colors';
import { parseToSettingsJson, parseZeroShotSettings, ZeroShotSettings } from './zero-shot-settings';
import { ConfigManager } from 'src/app/base/services/config-service';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';

@Component({
  selector: 'kern-zero-shot-details',
  templateUrl: './zero-shot-details.component.html',
  styleUrls: ['./zero-shot-details.component.scss'],
})
export class ZeroShotDetailsComponent
  implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('descriptionArea') descriptionArea: QueryList<ElementRef>;
  @ViewChildren('nameArea') nameArea: QueryList<ElementRef>;

  @ViewChildren('stickyHeader', { read: ElementRef }) stickyHeader: QueryList<ElementRef>;
  @ViewChild('customLabels', { read: ElementRef }) customLabels: ElementRef;

  get LabelSourceType(): typeof LabelSource {
    return LabelSource;
  }
  get InformationSourceType(): typeof InformationSourceType {
    return InformationSourceType;
  }

  colors = schemeCategory24;


  routeParams$: any;
  project: any;
  informationSource$: any;
  informationSourceQuery$: any;
  informationSource: any;
  subscriptions$: Subscription[] = [];
  lastTask$: any;
  lastTaskQuery$: any;
  labelingTasksQuery$: any;
  labelingTasks: Map<string, any> = new Map<string, any>();
  labelColor: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();
  labelingTasksClassification: any[];
  labelingTasksSortOrder = [];
  zeroShotRecommendations: any;
  isModelDownloading: boolean = false;

  description: string = '';
  isDescriptionOpen: boolean = false;
  informationSourceName: string = '';
  isNameOpen: boolean = false;

  zeroShotSettings: ZeroShotSettings;

  stickyObserver: IntersectionObserver;
  isHeaderNormal: boolean = true;
  testerOpen: boolean = true;

  testerRequestedSomething: boolean = false;
  canRunProject: boolean = false;
  singleLineTesterResult: string[];
  randomRecordTesterResult: any;
  attributesQuery$: any;
  attributes: any;
  textAttributes: any;
  specificRunOpen: Number = -1;
  specificRunTaskInformation$: any;
  status: string;
  confidenceIntervals = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  downloadedModels: any[];
  modelsDownloadedState: boolean[] = [];
  isManaged: boolean = true;

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private informationSourceApolloService: WeakSourceApolloService,
  ) { }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.status = this.activatedRoute.parent.snapshot.queryParams.status;
    const project$ = this.projectApolloService.getProjectById(projectId);
    let tasks$ = [];
    tasks$.push(this.prepareLabelingTaskRequest(projectId));
    tasks$.push(project$.pipe(first()));
    tasks$.push(this.prepareAttributes(projectId));
    this.prepareZeroShotRecommendations(projectId);
    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    forkJoin(tasks$).subscribe(() => this.prepareInformationSource(projectId));

    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.informationSourceApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => {
        this.downloadedModels = downloadedModels;
        this.createModelsDownloadedStateList();
      }));

    this.checkIfManagedVersion();

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
    this.setUpCommentRequests(projectId);
  }

  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.HEURISTIC, projectId: projectId });
    requests.push({ commentType: CommentType.LABEL, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['payload_finished', 'payload_failed', 'payload_created', 'payload_update_statistics'];
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
    toReturn.push(...['information_source_deleted', 'information_source_updated']);
    toReturn.push(...['label_created', 'label_deleted']);
    toReturn.push(...['zero-shot', 'label_deleted']);
    toReturn.push(...['zero_shot_download']);
    return toReturn;
  }

  checkIfManagedVersion() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfManagedVersion());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    for (const e of this.stickyHeader) {
      this.stickyObserver.unobserve(e.nativeElement);
    }
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  ngAfterViewInit() {
    this.descriptionArea.changes.subscribe(() => {
      this.setFocus(this.descriptionArea);
    });
    this.nameArea.changes.subscribe(() => {
      this.setFocus(this.nameArea);
    });
    this.stickyHeader.changes.subscribe(() => {
      if (this.stickyHeader.length) {
        this.prepareStickyObserver(this.stickyHeader.first.nativeElement);
      } else {
        this.stickyObserver = null;
      }
    });
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

  prepareAttributes(projectId: string) {
    let attributes$;
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId);
    this.subscriptions$.push(attributes$.subscribe((attributes) => {
      attributes.sort((a, b) => a.relativePosition - b.relativePosition);
      this.attributes = attributes;
      this.textAttributes = attributes.filter(a => a.dataType == 'TEXT');
    }));
    return attributes$.pipe(first());
  }


  prepareStickyObserver(element: HTMLElement) {
    if (this.stickyObserver) return;
    const toObserve = element;
    this.stickyObserver = new IntersectionObserver(
      ([e]) => {
        this.isHeaderNormal = e.isIntersecting;
      },
      { threshold: [1] }
    );
    this.stickyObserver.observe(toObserve)
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
      this.informationSource = informationSource;
      this.description = informationSource.description;
      this.informationSourceName = informationSource.name;
      this.fillZeroShotSettings(informationSource.sourceCode);
      this.canRunProject = !informationSource.lastTask || informationSource.lastTask.state != "CREATED";
    }));

  }

  timeDiffCalc(dateA: any, dateB: any = Date.now()) {
    return new Date(Math.abs(dateB - dateA)).toISOString().substring(11, 19);
  }

  fillZeroShotSettings(settingsJson: string) {
    this.zeroShotSettings = parseZeroShotSettings(settingsJson);

    this.zeroShotSettings.taskId = this.informationSource.labelingTaskId;
    this.zeroShotSettings.attributeSelectDisabled = this.textAttributes.length == 1 || this.labelingTasks.get(this.zeroShotSettings.taskId).taskTarget == 'ON_ATTRIBUTE';
    if (!this.zeroShotSettings.attributeId) this.zeroShotSettings.attributeId = this.labelingTasks.get(this.zeroShotSettings.taskId).attribute.id;
  }


  prepareLabelingTaskRequest(projectId: string) {
    let vc;
    [this.labelingTasksQuery$, vc] = this.projectApolloService.getLabelingTasksByProjectId(projectId);

    vc.subscribe((tasks) => {
      tasks.sort((a, b) => a.relativePosition - b.relativePosition)
      this.labelingTasksClassification = tasks.filter(t => t.taskType == LabelingTask.MULTICLASS_CLASSIFICATION)
      this.labelingTasks.clear();
      this.labelColor.clear();
      this.labelingTasksSortOrder = [];
      let labelIds = [];
      tasks.forEach((task) => {
        this.labelingTasks.set(task.id, task);

        this.labelingTasksSortOrder.push({ key: task.id, order: task.relativePosition });
        labelIds.push(...task.labels.map((label) => label.id));
        let labelColorMap = new Map<string, string>();
        task.labels.forEach(label => labelColorMap.set(label.name, label.color));
        this.labelColor.set(task.id, labelColorMap);

      });
      this.colors.domain(labelIds);
    });

    return vc.pipe(first());
  }

  deleteInformationSource(projectId: string, informationSourceId: string) {
    this.informationSourceApolloService
      .deleteInformationSource(projectId, informationSourceId).pipe(first())
      .subscribe();
  }

  saveInformationSource() {
    this.informationSourceApolloService
      .updateInformationSource(
        this.project.id,
        this.informationSource.id,
        this.zeroShotSettings.taskId,
        parseToSettingsJson(this.zeroShotSettings),
        this.description,
        this.informationSourceName
      ).pipe(first())
      .subscribe();
  }

  setFocus(focusArea: QueryList<ElementRef>) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }
  openDescription(open: boolean) {
    this.isDescriptionOpen = open;
    if (!open && this.description != this.informationSource.description) {
      this.saveInformationSource();
    }
  }
  openName(open: boolean) {
    this.isNameOpen = open;
    if (!open && this.informationSourceName != this.informationSource.name) {
      this.saveInformationSource();
    }
  }
  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
  }

  changeInformationSourceName(event) {
    this.informationSourceName = event.target.value;
    if (this.informationSourceName != event.target.value) {
      event.target.value = this.informationSourceName;
    }
    this.isHeaderNormal = true;
  }


  getInformationSourceTypeString(type: InformationSourceType) {
    return informationSourceTypeToString(type, false, true);
  }

  runZeroShotTest(text: string) {
    if (text.length == 0) return;
    if (this.testerRequestedSomething) return;
    let labels;
    const useTaskLabels = this.customLabels.nativeElement.value == '';
    if (useTaskLabels) {
      labels = this.labelingTasks.get(this.zeroShotSettings.taskId).labels
        .filter(l => !this.zeroShotSettings.excludedLabels.includes(l.id))
        .map(l => l.name);
    }
    else labels = this.customLabels.nativeElement.value.split(",").map(l => l.trim());
    if (!labels?.length) return;
    this.testerRequestedSomething = true;
    this.singleLineTesterResult = null;
    this.informationSourceApolloService.getZeroShotText(this.project.id, this.informationSource.id, this.zeroShotSettings.targetConfig, text, this.zeroShotSettings.runIndividually, JSON.stringify(labels))
      .pipe(first()).subscribe((r) => {
        r.labels.forEach(e => {
          e.labelId = this.getLabelIdFromName(e.labelName);
          e.confidenceText = (e.confidence * 100).toFixed(2) + "%";
        });
        this.singleLineTesterResult = r.labels;
        this.testerRequestedSomething = false;
      })
  }

  runZeroShot10RecordTest() {
    if (this.testerRequestedSomething) return;
    this.testerRequestedSomething = true;
    this.randomRecordTesterResult = null;
    let labels = null;
    const customLabelValue = this.customLabels.nativeElement.value;
    const useTaskLabels = customLabelValue == '';
    if (!useTaskLabels) labels = JSON.stringify(customLabelValue.split(",").map(l => l.trim()));
    else if (useTaskLabels && this.zeroShotSettings.excludedLabels.length) {
      labels = JSON.stringify(this.labelingTasks.get(this.zeroShotSettings.taskId).labels
        .filter(l => !this.zeroShotSettings.excludedLabels.includes(l.id))
        .map(l => l.name));
    }
    this.informationSourceApolloService.getZeroShot10RandomRecords(this.project.id, this.informationSource.id, labels)
      .pipe(first()).subscribe((r) => {
        if (r) {
          r.durationText = "~" + Math.round(r.duration * 100) / 100 + " sec";
          r.records.forEach(record => {
            record.shortView = true;
            record.fullRecordData = JSON.parse(record.fullRecordData);
            record.labels.forEach(e => {
              e.labelId = this.getLabelIdFromName(e.labelName);
              e.confidenceText = (e.confidence * 100).toFixed(2) + "%";
            });
          });

          this.randomRecordTesterResult = r;
        }
        this.testerRequestedSomething = false;
      })
  }

  runZeroShotProject() {
    if (!this.canRunProject) return;
    this.canRunProject = false;
    this.informationSourceApolloService.runZeroShotProject(this.project.id, this.informationSource.id).pipe(first()).subscribe(
      () => this.informationSourceQuery$.refetch()
    );
  }

  getLabelIdFromName(name: string): string {
    for (const label of this.labelingTasks.get(this.zeroShotSettings.taskId).labels) {
      if (label.name == name) return label.id;
    }
    return null;
  }

  changeZeroShotSettings(attributeName: string, newValue: any, saveToDb: boolean = true) {
    if (attributeName == "excludedLabels") {
      if (this.zeroShotSettings.excludedLabels.includes(newValue)) {
        this.zeroShotSettings.excludedLabels = this.zeroShotSettings.excludedLabels.filter(id => id != newValue);
      } else {
        this.zeroShotSettings.excludedLabels.push(newValue);
      }
    } else {
      if (attributeName == 'minConfidence') newValue /= 100;
      this.zeroShotSettings[attributeName] = newValue;
      if (attributeName == 'taskId') {
        this.zeroShotSettings.attributeSelectDisabled = this.textAttributes.length == 1 || this.labelingTasks.get(this.zeroShotSettings.taskId).taskTarget == 'ON_ATTRIBUTE';
      }
    }

    if (saveToDb) this.saveInformationSource();
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
      if (this.informationSource.id == msgParts[2]) this.informationSourceQuery$.refetch();

    } else if ('zero_shot_download' == msgParts[1]) {
      if (this.informationSource.id == msgParts[3]) {
        if ("started" == msgParts[2]) this.isModelDownloading = true;
        if ("finished" == msgParts[2]) this.isModelDownloading = false;
      }
    } else if (msgParts[1] == 'zero-shot') {
      if (this.informationSource.lastTask) {
        const task = this.informationSource.lastTask;
        if (task.id == msgParts[2]) {
          if (msgParts[3] == 'progress') {
            task.progress = Number(msgParts[4]);
          } else if (msgParts[3] == 'state') {
            if (msgParts[4] == "FINISHED") {
              this.informationSourceQuery$.refetch();
            } else task.state = msgParts[4];
          }
        }
      }
    }
  }

  getAttributeName(attId: string) {
    return this.attributes.find(el => el.id == attId).name;
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

  createModelsDownloadedStateList() {
    if (this.zeroShotRecommendations !== undefined) {
      this.zeroShotRecommendations.forEach(rec => {
        const isDownloaded = this.downloadedModels.find(el => el.name === rec.configString);
        this.modelsDownloadedState.push(isDownloaded != undefined ? true : false);
      })
    }
  }
}
