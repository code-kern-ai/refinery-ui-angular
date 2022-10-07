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
import { first, refCount } from 'rxjs/operators';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import {
  debounceTime,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';
import { combineLatest, forkJoin, Subscription, timer } from 'rxjs';
import { InformationSourceType, informationSourceTypeToString, LabelingTask, LabelSource } from 'src/app/base/enum/graphql-enums';
import { dateAsUTCDate, parseLinkFromText } from 'src/app/util/helper-functions';
import { NotificationService } from 'src/app/base/services/notification.service';
import { schemeCategory24 } from 'src/app/util/colors';
import { parseToSettingsJson, parseCrowdSettings, CrowdLabelerHeuristicSettings, buildFullLink } from './crowd-labeler-settings';
import { ConfigManager } from 'src/app/base/services/config-service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';

@Component({
  selector: 'kern-crowd-labeler-details',
  templateUrl: './crowd-labeler-details.component.html',
  styleUrls: ['./crowd-labeler-details.component.scss'],
})
export class CrowdLabelerDetailsComponent
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
  labelingTasksQuery$: any;
  labelingTasks: Map<string, any> = new Map<string, any>();
  labelColor: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();
  labelingTasksUseable: any[];
  labelingTasksSortOrder = [];
  useTaskLabels: boolean = true;
  zeroShotRecommendations: any;
  isModelDownloading: boolean = false;

  description: string = '';
  isDescriptionOpen: boolean = false;
  informationSourceName: string = '';
  isNameOpen: boolean = false;


  stickyObserver: IntersectionObserver;
  isHeaderNormal: boolean = true;
  testerOpen: boolean = true;

  testerRequestedSomething: boolean = false;
  canRunProject: boolean = false;
  singleLineTesterResult: string[];
  randomRecordTesterResult: any;
  status: string;
  isManaged: boolean = true;



  crowdSettings: CrowdLabelerHeuristicSettings;
  annotators: any[];
  annotatorLookup: {};
  dataSlicesQuery$: any;
  dataSlices: any[];
  sliceLookup: {};
  private fromCreation: boolean = false;

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private informationSourceApolloService: WeakSourceApolloService,
    private organizationApolloService: OrganizationApolloService,
  ) { }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.status = this.activatedRoute.parent.snapshot.queryParams.status;
    const project$ = this.projectApolloService.getProjectById(projectId);
    let tasks$ = [];
    tasks$.push(this.prepareLabelingTaskRequest(projectId));
    tasks$.push(this.prepareDataSlicesRequest(projectId));
    tasks$.push(this.prepareAnnotators());
    tasks$.push(project$.pipe(first()));


    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    forkJoin(tasks$).subscribe(() => this.prepareInformationSource(projectId));

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
    requests.push({ commentType: CommentType.DATA_SLICE, projectId: projectId });
    requests.push({ commentType: CommentType.LABEL, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['payload_finished', 'payload_failed', 'payload_created', 'payload_update_statistics'];
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
    toReturn.push(...['information_source_deleted', 'information_source_updated']);
    toReturn.push(...['label_created', 'label_deleted']);
    toReturn.push(...['data_slice_created', 'data_slice_updated', 'data_slice_deleted']);
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

  generateAccessLink() {
    if (this.crowdSettings.accessLinkId) return;
    this.projectApolloService.createAccessLink(this.project.id, "HEURISTIC", this.informationSource.id).pipe(first()).subscribe((res) => {
      if (res?.data?.generateAccessLink?.link?.id) {
        this.fromCreation = true;
        this.removeAccessLink();
        this.fillLinkData(res.data.generateAccessLink.link);
        this.crowdSettings.accessLinkId = res.data.generateAccessLink.link.id;
        this.crowdSettings.accessLinkLocked = res.data.generateAccessLink.link.isLocked;
        this.saveInformationSource();
      }
    });
  }

  removeAccessLink() {
    if (!this.crowdSettings.accessLinkId) return
    this.projectApolloService.removeAccessLink(this.project.id, this.crowdSettings.accessLinkId).pipe(first()).subscribe();
    this.crowdSettings.accessLinkId = null;
    this.saveInformationSource();
  }

  changeAccessLinkLock(state: boolean) {
    if (!this.crowdSettings.accessLinkId) return
    this.projectApolloService.lockAccessLink(this.project.id, this.crowdSettings.accessLinkId, state).pipe(first()).subscribe();
    this.crowdSettings.accessLinkLocked = state;

  }
  prepareAnnotators() {
    const firstReturn = this.organizationApolloService.getOrganizationUsers("ANNOTATOR").pipe(first());
    firstReturn.subscribe(users => {
      this.annotators = users;
      this.annotatorLookup = {};
      this.annotators.forEach(annotator => {
        annotator.text = annotator.mail;
        this.annotatorLookup[annotator.id] = annotator;
      });
    });
    return firstReturn;
  }
  prepareDataSlicesRequest(projectId: string) {
    let tmp$;
    [this.dataSlicesQuery$, tmp$] = this.projectApolloService.getDataSlices(projectId, "STATIC_DEFAULT");
    this.subscriptions$.push(tmp$.subscribe((slices) => {
      this.dataSlices = slices;
      this.sliceLookup = {};
      this.dataSlices.forEach(slice => {
        this.sliceLookup[slice.id] = slice;
      });
    }));
    return tmp$.pipe(first());
  }

  prepareInformationSource(projectId: string) {
    const informationSourceId = this.activatedRoute.snapshot.paramMap.get('informationSourceId');
    [this.informationSourceQuery$, this.informationSource$] = this.informationSourceApolloService.getInformationSourceBySourceId(projectId, informationSourceId);
    this.subscriptions$.push(this.informationSource$.subscribe((informationSource) => {

      this.informationSource = informationSource;
      this.fillSettings(informationSource.sourceCode);
      this.description = informationSource.description;
      this.informationSourceName = informationSource.name;
      this.fromCreation = false;
    }));

  }
  fillSettings(settingsJson: string) {
    if (this.fromCreation) return;
    this.crowdSettings = parseCrowdSettings(settingsJson);

    this.crowdSettings.taskId = this.informationSource.labelingTaskId;
    if (this.crowdSettings.accessLinkId) {
      this.projectApolloService.getAccessLink(this.project.id, this.crowdSettings.accessLinkId).pipe(first()).subscribe((res) => {
        this.fillLinkData(res)
      });
    }
  }

  private fillLinkData(linkObj: any) {
    this.crowdSettings.accessLink = linkObj.link;
    this.crowdSettings.accessLinkParsed = buildFullLink(linkObj.link);
    this.crowdSettings.accessLinkLocked = linkObj.isLocked;
    this.crowdSettings.isHTTPS = window.location.protocol == 'https:';
  }


  prepareLabelingTaskRequest(projectId: string) {
    let vc;
    [this.labelingTasksQuery$, vc] = this.projectApolloService.getLabelingTasksByProjectId(projectId);

    vc.subscribe((tasks) => {
      tasks.sort((a, b) => a.relativePosition - b.relativePosition)
      this.labelingTasksUseable = tasks.filter(t => t.taskType != LabelingTask.NOT_SET)
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
        this.crowdSettings.taskId,
        parseToSettingsJson(this.crowdSettings),
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



  changeSettings(attributeName: string, newValue: any, saveToDb: boolean = true) {
    this.crowdSettings[attributeName] = newValue;
    if (saveToDb) {
      this.saveInformationSource();
    }
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

    }
  }

  testLink() {
    const linkData = parseLinkFromText(this.crowdSettings.accessLink);
    this.router.navigate([linkData.route], { queryParams: linkData.queryParams });
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

  copyToClipboard(textToCopy) {
    navigator.clipboard.writeText(textToCopy);
  }

}
