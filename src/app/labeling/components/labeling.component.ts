import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { concat, forkJoin, interval, Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { RouteService } from 'src/app/base/services/route.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Project } from 'src/app/base/entities/project';
import { FormControl } from '@angular/forms';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { schemeCategory24 } from 'src/app/util/colors';
import {
  getTaskTypeOrder,
  InformationSourceReturnType,
  informationSourceTypeToString,
  LabelingTask,
  LabelingTaskTarget,
  LabelSource,
  labelSourceToString,
} from 'src/app/base/enum/graphql-enums';
import { NotificationApolloService } from 'src/app/base/services/notification/notification-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { assumeUserRole, guessLinkType, labelingHuddle, labelingLinkData, labelingLinkType, parseLabelingLinkData, userRoles } from './helper/labeling-helper';

@Component({
  selector: 'kern-labeling',
  templateUrl: './labeling.component.html',
  styleUrls: ['./labeling.component.scss'],
})
export class LabelingComponent implements OnInit, OnDestroy {
  get LabelSourceType(): typeof LabelSource {
    return LabelSource;
  }
  get LabelingTaskType(): typeof LabelingTask {
    return LabelingTask;
  }


  static LABEL_SEARCH_TEXT_DEFAULT = "Search label name...";
  static DUMMY_HUDDLE_ID = "00000000-0000-0000-0000-000000000000";
  static ALLOWED_KEYS = " 01234567890abcdefghijklmnopqrstuvwxyzöäüß<>|,.;:-_#'\"~+*?\\{}[]()=/&%$§!@^°€";
  GOLD_USER_ID = "GOLD_USER"; //not static to prevent call of getter on every cycle
  firstVisitGold: boolean = true;
  attributesQuery$: any;
  recordLabelAssociations$: any;
  recordLabelAssociationsQuery$: any;
  recordData$: any;
  recordData: any;
  fullRecordData: any;
  project: Project;
  project$: any;
  user$: any;

  dataSliceQuery$: any;
  dataSlices$: any;

  // sourceId: string; // if the session is from an annotator heuristic

  user: any;
  displayUserId: any;
  rlaGroupMap: Map<string, any[]> = new Map<string, any[]>();
  userIcons: any[];
  userTaskGold: Map<string, Map<string, { hasGold: boolean, isGold: boolean }>> =
    new Map<string, Map<string, { hasGold: boolean, isGold: boolean }>>()

  dummyUserMap: Map<string, any> = new Map<string, any>();
  sortOrder: any[] = [];

  showNLabelButton: Number = 5;

  huddleData: labelingHuddle;
  sessionRequested: boolean = false;
  subscriptions$: Subscription[] = [];
  somethingLoading: boolean = true;

  showInformationSourcesFlag: boolean = false;

  @ViewChild('baseDomElement', { read: ElementRef }) baseDomElement: ElementRef;
  @ViewChildren('labelButton', { read: ElementRef })
  labelButtons: QueryList<ElementRef>;
  @ViewChildren('userDropdownSelect', { read: ElementRef })
  userDropdownSelects: QueryList<ElementRef>;
  @ViewChild('setLabelBox', { read: ElementRef }) labelBox: ElementRef;
  @ViewChild('commentBox', { read: ElementRef }) commentBox: ElementRef;
  @ViewChild('commentInput', { read: ElementRef }) commentInput: ElementRef;
  @ViewChild('dataBlock', { read: ElementRef }) dataBlock: ElementRef;
  @ViewChild('labelSearchText', { read: ElementRef }) labelSearchText: ElementRef;
  @ViewChild('labelSearchBlinker', { read: ElementRef }) labelSearchBlinker: ElementRef;
  @ViewChild('modalGoldUser', { read: ElementRef }) modalGoldUser: ElementRef;

  commentForm = new FormControl('');

  //selection
  selectionJSON: any;
  isLabelBoxOpen: boolean = false;
  isCommentBoxOpen: boolean = false;
  commentMarkedData;
  overviewDisplay: any = [];
  showTokenFlag: boolean = false;
  showTokenDisabled: boolean = true;
  extendedDisplay: any = {};
  tokenOverlayData: any = {};

  labelingTaskWait: boolean;
  labelingTasks$: any;
  labelingTasksQuery$: any;
  labelingTasksMap = new Map<string, any>();
  labelHotkeys: Map<string, { taskId: string, labelId: string }> = new Map<string, { taskId: string, labelId: string }>();
  activeTask;
  tokenSubscription$;
  debounceTimer;
  autoNextRecord: boolean = false;


  labelingLinkData: labelingLinkData;
  roleAssumed: boolean = false;

  constructor(
    private router: Router,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private recordApolloService: RecordApolloService,
    private projectApolloService: ProjectApolloService,
    private notificationApolloService: NotificationApolloService,
    private organizationService: OrganizationApolloService,
  ) { }

  ngOnDestroy() {
    if (this.tokenSubscription$) this.tokenSubscription$.unsubscribe();
    if (this.recordData$) this.recordData$.unsubscribe();
    if (this.recordLabelAssociations$) this.recordLabelAssociations$.unsubscribe();
    this.subscriptions$.forEach(element => element.unsubscribe());
    if (this.project) NotificationService.unsubscribeFromNotification(this, this.project.id)
  }


  ngOnInit(): void {
    this.initialSetupNoWait();

    let initialTasks$ = [];
    initialTasks$.push(this.prepareUser());
    forkJoin(initialTasks$).pipe(first()).subscribe(() => {

      //user is set to null if a redirect is needed
      if (!this.user) return;
      let initialTasks$ = [];
      initialTasks$.push(this.prepareProject(this.labelingLinkData.projectId));
      initialTasks$.push(this.prepareLabelingTask(this.labelingLinkData.projectId));
      initialTasks$.push(this.prepareSortOrder(this.labelingLinkData.projectId));
      //wait for preparation tasks to finish
      forkJoin(initialTasks$).pipe(first()).subscribe(() => this.prepareLabelingSession(this.labelingLinkData.projectId, this.labelingLinkData.id, this.labelingLinkData.requestedPos));
    });
  }

  private initialSetupNoWait() {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.labelingLinkData = parseLabelingLinkData(this.activatedRoute);
    const projectId = this.labelingLinkData.projectId;

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });

    let tmp = localStorage.getItem("showNLabelButton");
    if (tmp) this.showNLabelButton = Number(tmp);
    let autoNextRecord = localStorage.getItem("autoNextRecord");
    if (autoNextRecord) this.autoNextRecord = autoNextRecord === 'true' ? true : false;
    this.huddleData = JSON.parse(localStorage.getItem("huddleData"));

  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['label_created', 'label_deleted', 'attributes_updated'];
    toReturn.push(...['payload_finished', 'weak_supervision_finished']);
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
    toReturn.push(...['record_deleted', 'rla_created', 'rla_deleted']);
    return toReturn;
  }

  prepareProject(projectId: string) {
    this.project$ = this.projectApolloService.getProjectById(projectId);
    this.subscriptions$.push(this.project$.subscribe((project) => {
      this.project = project;
    }));

    return this.project$.pipe(first());
  }

  setShowNLabelButton(n: Number) {
    if (n < 0) n = 0;
    this.showNLabelButton = n;
    localStorage.setItem("showNLabelButton", "" + this.showNLabelButton);
  }

  prepareLabelingSession(projectId: string, huddleId: string, pos: number) {
    if (this.sessionRequested) return;

    if (this.huddleData && !this.huddleData.partial
      && this.huddleData.linkData.projectId == projectId
      && (this.huddleData.linkData.id == huddleId || huddleId == LabelingComponent.DUMMY_HUDDLE_ID)) {
      this.notificationApolloService.createNotification(projectId, "Continuation of your previous session.")
        .pipe(first())
        .subscribe();
    }

    //default handling
    if (pos == null && this.huddleData?.linkData.requestedPos) pos = this.huddleData.linkData.requestedPos;
    if (pos == null) pos = 0;
    if (huddleId == LabelingComponent.DUMMY_HUDDLE_ID && this.huddleData?.linkData.id) huddleId = this.huddleData.linkData.id;

    //request preparation
    if (!this.huddleData || this.huddleData.linkData.id != huddleId || this.huddleData.linkData.projectId != projectId) {
      // no/old session data --> refetch
      this.huddleData = null;
      localStorage.removeItem("huddleData");
      this.requestHuddleData(projectId, huddleId);

    } else if (this.huddleData.partial) {
      //collect remaining
      this.requestHuddleData(projectId, huddleId);
    }
    if (this.huddleData) this.jumpToPosition(projectId, pos);

    this.sessionRequested = true;

  }

  requestHuddleData(projectId: string, huddleId: string) {
    if (huddleId != this.labelingLinkData.id) {
      console.log("something wrong with session/huddle integration");
      return
    }
    this.projectApolloService.requestHuddleData(projectId, this.labelingLinkData.id, this.labelingLinkData.linkType).pipe(first()).subscribe((huddleData) => {
      if (huddleId == LabelingComponent.DUMMY_HUDDLE_ID) this.labelingLinkData.id = huddleData.huddleId;
      if (!huddleData.huddleId) {
        //nothing was found (no slice / heuristic available)
      }
      this.labelingLinkData.requestedPos = huddleData.startPos;
      this.huddleData = {
        recordIds: huddleData.recordIds as string[],
        partial: false,
        linkData: this.labelingLinkData,
        allowedTask: huddleData.allowedTask,
        canEdit: huddleData.canEdit,
      }

      localStorage.setItem('huddleData', JSON.stringify(this.huddleData));

      const pos = this.labelingLinkData.requestedPos + 1; //zero based in backend
      this.jumpToPosition(projectId, pos);


    });


  }
  getSourceId(): string {
    if (!this.huddleData) return null;
    if (this.huddleData.linkData.linkType != labelingLinkType.HEURISTIC) return null;
    return this.huddleData.linkData.id;
  }

  jumpToPosition(projectId: string, pos: number, setJumpHTMLItem: boolean = false) {
    if (!this.huddleData || !this.huddleData.recordIds) return;
    if (pos % 1 != 0) pos = parseInt("" + pos);
    let jumpPos = String(pos).length == 0 ? 1 : pos;
    if (jumpPos <= 0) jumpPos = 1;
    else if (jumpPos > this.huddleData.recordIds.length) jumpPos = this.huddleData.recordIds.length;

    this.huddleData.linkData.requestedPos = jumpPos;
    localStorage.setItem('huddleData', JSON.stringify(this.huddleData));

    //ensure adress matches request
    this.router.navigate(["../" + projectId + "/labeling/" + this.huddleData.linkData.id],
      { relativeTo: this.activatedRoute.parent, queryParams: { pos: jumpPos, type: this.huddleData.linkData.linkType } });

    this.resetDataToInitialTask();
    if (this.debounceTimer) this.debounceTimer.unsubscribe();
    this.debounceTimer = timer(200).subscribe(() => this.collectRecordData(projectId, this.huddleData.recordIds[jumpPos - 1]));

  }
  checkNumberInput($event) {
    if (Number($event.target.value) % 1 != 0) $event.target.value = parseInt($event.target.value);
  }

  prepareUser() {
    const pipeFirst = this.organizationService.getUserInfo()
      .pipe(first());

    pipeFirst.subscribe((user) => {

      if (!this.labelingLinkData.id) {
        this.user = null;
        const type = guessLinkType(user.role);
        this.router.navigate([LabelingComponent.DUMMY_HUDDLE_ID], { relativeTo: this.activatedRoute, queryParams: { pos: 0, type: type }, });
        return;
      }
      this.user = { ...user };
      this.user.role = assumeUserRole(user.role, this.labelingLinkData.linkType);
      this.roleAssumed = this.user.role != user.role;
      this.displayUserId = user.id;

    });
    return pipeFirst;
  }

  prepareSortOrder(projectId: string) {
    let vc$;
    [this.attributesQuery$, vc$] = this.projectApolloService.getAttributesByProjectId(projectId);
    const pipeFirst = vc$.pipe(first());

    this.subscriptions$.push(vc$.subscribe((attributes) => {
      this.sortOrder = [];
      attributes.forEach((att) => {
        this.sortOrder.push({ key: att.name, order: att.relativePosition });
      });
      this.sortOrder.sort((a, b) => a.order - b.order);
      this.applyColumnOrder();
    }));
    return pipeFirst;
  }

  prepareLabelingTask(projectID: string) {
    [this.labelingTasksQuery$, this.labelingTasks$] = this.projectApolloService.getLabelingTasksByProjectId(projectID);
    [this.dataSliceQuery$, this.dataSlices$] = this.projectApolloService.getDataSlices(projectID);
    this.subscriptions$.push(this.labelingTasks$.subscribe((tasks) => {
      this.resetTaskData(tasks);
    }));
    return this.labelingTasks$.pipe(first());
  }

  private resetTaskData(tasks) {
    tasks.sort((a, b) => this.compareOrderLabelingTasks(a, b)) //ensure same position

    this.labelHotkeys.clear();
    if (this.onlyLabelsChanged(tasks)) {
      tasks.forEach((task) => {
        task.labels.sort((a, b) => a.name.localeCompare(b.name));
        task.labels.forEach(l => {
          if (l.hotkey) this.labelHotkeys.set(l.hotkey, { taskId: task.id, labelId: l.id });
        });
        this.labelingTasksMap.get(task.id).labels = task.labels;
      });
    } else {
      this.labelingTasksMap.clear();
      this.showTokenDisabled = true;
      tasks.forEach((task) => {
        task.labels.sort((a, b) => a.name.localeCompare(b.name));
        task.labels.forEach(l => {
          if (l.hotkey) this.labelHotkeys.set(l.hotkey, { taskId: task.id, labelId: l.id });
        });
        this.labelingTasksMap.set(task.id, task);
        if (this.showTokenDisabled && task.taskType == LabelingTask.INFORMATION_EXTRACTION) this.showTokenDisabled = false;
      });
    }

    this.labelingTaskWait = false;
  }

  compareOrderLabelingTasks(a, b): number {
    const rPos = a.relativePosition - b.relativePosition;
    if (rPos) return rPos;
    const taskTypePos = getTaskTypeOrder(a.taskType) - getTaskTypeOrder(b.taskType);
    if (taskTypePos) return taskTypePos;
    return a.name.localeCompare(b.name);
  }


  onlyLabelsChanged(tasks): boolean {
    if (this.labelingTasksMap.size == 0) return false;
    if (this.labelingTasksMap.size != tasks.length) return false;
    for (const task of tasks) {
      if (!this.labelingTasksMap.has(task.id)) return false;
      if (this.labelingTasksMap.get(task.id).taskType != task.taskType)
        return false;
      if (this.labelingTasksMap.get(task.id).name != task.name) return false;
    }

    return true;
  }

  isLabelSearchTextEmpty(): boolean {
    let t = this.labelSearchText?.nativeElement.innerHTML.toString();
    return t == LabelingComponent.LABEL_SEARCH_TEXT_DEFAULT || t == "";
  }

  handleFakeInputBox(event: KeyboardEvent) {
    let t = this.labelSearchText.nativeElement.innerHTML.toString();
    switch (event.key) {
      case 'backspace':
      case 'Backspace':
        if (this.isLabelSearchTextEmpty() || t.length <= 1) {
          this.clearSearch();
          return;
        }
        else t = t.slice(0, t.length - 1);
        break;
      case 'delete':
      case 'Delete':
        this.clearSearch();
        return;
      default:
        if (this.isValidKey(event.key)) {
          if (this.isLabelSearchTextEmpty()) t = '';
          t += event.key;
        }
        break;
    }
    this.labelSearchText.nativeElement.innerHTML = t;


    if (event.key == 'space' || event.key == ' ') {
      this.labelSearchBlinker.nativeElement.classList.add('ml-0.5');
    } else {
      this.labelSearchBlinker.nativeElement.classList.remove('ml-0.5');
    }
    if (!this.labelSearchBlinker.nativeElement.classList.contains('blink_me') && t != LabelingComponent.LABEL_SEARCH_TEXT_DEFAULT) {
      this.labelSearchBlinker.nativeElement.classList.add('blink_me');
    }
  }
  clickLabelSearchBox() {
    if (!this.labelSearchBlinker.nativeElement.classList.contains('blink_me')) {
      this.labelSearchBlinker.nativeElement.classList.add('blink_me');
    }
    if (this.isLabelSearchTextEmpty()) this.labelSearchText.nativeElement.innerHTML = "";
  }

  clearSearch() {
    this.labelSearchText.nativeElement.innerHTML = LabelingComponent.LABEL_SEARCH_TEXT_DEFAULT;
    this.labelSearchBlinker.nativeElement.classList.remove('blink_me');
  }

  isValidKey(key: string): boolean {
    return key == 'space' || LabelingComponent.ALLOWED_KEYS.includes(key.toLowerCase());

  }

  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.getModifierState('Control')) return;

    if (!this.labelSearchBlinker || !this.labelSearchBlinker.nativeElement.classList.contains('blink_me')) {
      //only blinks when box is "clicked"
      this.labelHotkeys.forEach((v, k) => {
        if (k == event.key) {
          const type = this.labelingTasksMap.get(v.taskId).taskType
          if (type == LabelingTask.MULTICLASS_CLASSIFICATION) {
            this.addLabelToTask(v.taskId, v.labelId);
          } else if (this.isLabelBoxOpen && type == LabelingTask.INFORMATION_EXTRACTION) {
            this.addLabelToMarkedText(v.taskId, v.labelId);
          }
        }
      })
    }

    if (this.isLabelBoxOpen) {
      if (event.key == 'Escape' || event.key == 'Esc') {
        this.closeLabelBox();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.handleFakeInputBox(event);
      return;
    }
    if (this.isCommentBoxOpen) return;

    if (event.key == 'ArrowRight') {
      this.nextRecord();
    } else if (event.key == 'ArrowLeft') {
      this.previousRecord();
    }
    if ('123456789'.includes(event.key)) {
      const selectedPos = Number(event.key) - 1;
      if (selectedPos < this.userIcons.length) {
        this.showUserData(this.userIcons[selectedPos].id);
      }
    }

  }

  resetDataToInitialTask() {
    this.displayUserId = this.user.id;
    this.userTaskGold.clear();
    this.rlaGroupMap = null;
    this.fullRecordData = null;
    this.extendedDisplay = {};
    this.tokenOverlayData = {};
    this.userIcons = [];
    this.resetTokenizedRecord();
    this.labelingLinkData = parseLabelingLinkData(this.activatedRoute);
    for (let [key, value] of this.labelingTasksMap.entries()) {
      if (value.tokenizedAttribute) delete value.tokenizedAttribute;
    }
  }

  hasTokenData(taskId: string = null): boolean {
    if (taskId)
      return this.labelingTasksMap
        .get(taskId)
        .hasOwnProperty('tokenizedAttriute');
    for (const [key, value] of this.labelingTasksMap.entries()) {
      if (value.tokenizedAttribute) return true;
    }
    return false;
  }

  collectRecordData(projectId: string, recordId: string) {
    if (recordId == null || recordId == "deleted") {
      this.fullRecordData = { id: recordId };
      if (this.recordLabelAssociations$) this.recordLabelAssociations$.unsubscribe();
      return;
    }
    this.labelingTasksQuery$.refetch();
    this.resetDataToInitialTask();
    //call parallel so time isn't lost for each request
    //first token (unchangedable..ish -- if a tasks type changes this will be called again)
    this.getTokenizedRecord(recordId);

    //then base record data (unchangedable)
    if (this.recordData$) this.recordData$.unsubscribe();
    this.recordData$ = this.recordApolloService.getRecordByRecordId(projectId, recordId)
      .pipe(first()).subscribe((recordData) => {
        if (!recordData) {
          this.huddleData.recordIds[this.huddleData.linkData.requestedPos - 1] = "deleted"
          this.jumpToPosition(this.project.id, this.huddleData.linkData.requestedPos);
          return;
        }
        this.recordData = recordData;
        this.prepareFullRecord();
        this.prepareInformationExtractionDisplay();
        this.recordData$ = null;
      });


    //then rlas (keep open to update when nessecary)
    if (this.recordLabelAssociations$) this.recordLabelAssociations$.unsubscribe();
    [this.recordLabelAssociationsQuery$, this.recordLabelAssociations$] = this.recordApolloService.getRecordLabelAssociations(projectId, recordId);
    this.recordLabelAssociations$ = this.recordLabelAssociations$
      .subscribe((recordLabelAssociations) => {
        if (!recordLabelAssociations) return;
        recordLabelAssociations.forEach((rla) => {
          if (rla.sourceId && this.user.role == "ANNOTATOR" && rla.sourceId == this.getSourceId()) {
            rla.sourceType = LabelSource.MANUAL;
            rla.sourceId = null;
          }
        });

        this.extendRecordLabelAssociations(recordLabelAssociations);
        this.parseRlaToGroups(recordLabelAssociations)
        this.prepareFullRecord();
        this.prepareInformationExtractionDisplay();
        this.somethingLoading = false;

      });
  }

  getTokenizedRecord(recordId: string, fullRefresh: boolean = false) {
    if (recordId == null || recordId == "deleted") return;
    if (this.tokenSubscription$) this.tokenSubscription$.unsubscribe();
    this.tokenSubscription$ = this.recordApolloService.getTokenizedRecord(recordId)
      .pipe(first()).subscribe((r) => {
        if (!r) return;
        this.addTokenDataToTask(r);
        this.prepareInformationExtractionDisplay();
        if (fullRefresh) {
          this.userTaskGold.clear();
          this.prepareFullRecord();
        }
        this.tokenSubscription$ = null;

      });
  }


  prepareFullRecord() {
    if (!this.rlaGroupMap || !this.recordData) return;

    this.fullRecordData = this.recordData;
    this.fullRecordData.recordLabelAssociations = this.getRlaForUser(this.displayUserId);
    this.addTaskToRecord();
    this.ensureTaskAllowed();
    this.findUserGoldTasks();
    this.upateTaskStarPotential();
    this.rebuildOverviewDisplay();
    this.applyColumnOrder();
  }

  upateTaskStarPotential() {
    for (const [key, task] of this.labelingTasksMap.entries()) {
      task.hasStarPotential = false;
      if (this.userIcons.length <= 1) continue;
      if (this.displayUserId == this.GOLD_USER_ID) continue;
      if (!this.hasSomeRlas(task)) continue;
      task.hasStarPotential = !this.allGroupsEqualForTask(task);
    }
  }

  hasSomeRlas(task): boolean {
    let rlas = this.rlaGroupMap.get(this.displayUserId) || [];
    if (rlas.length == 0) return false;
    rlas = rlas.filter(rla => task.labels.some(l => l.id == rla.labelingTaskLabelId));
    return rlas.length != 0;
  }

  rlaGroupsEqual(labelsInTask: any[], idA: string, idB: string): boolean {
    if (!this.rlaGroupMap.has(idA) || !this.rlaGroupMap.has(idB)) return false;
    const userARlas = this.rlaGroupMap.get(idA)
      .filter(rla => labelsInTask.some(l => l.id == rla.labelingTaskLabelId));
    const userBRlas = this.rlaGroupMap.get(idB)
      .filter(rla => labelsInTask.some(l => l.id == rla.labelingTaskLabelId));
    if (userARlas.length != userBRlas.length) return false;
    for (const rla of userARlas) {
      if (!userBRlas.some(r => r.labelingTaskLabelId == rla.labelingTaskLabelId
        && r.tokenStartIdx == rla.tokenStartIdx
        && r.tokenEndIdx == rla.tokenEndIdx)) return false;
    }
    return true;
  }

  allGroupsEqualForTask(task): boolean {
    let previousKey = null;
    for (const [key, rlaGroup] of this.rlaGroupMap.entries()) {
      if (key == "GLOBAL") continue;
      if (previousKey) {
        if (!this.rlaGroupsEqual(task.labels, key, previousKey)) {

          return false;
        }
      }
      previousKey = key;
    }
    return true;
  }

  showUserData(userId) {
    this.displayUserId = userId
    this.fullRecordData.recordLabelAssociations = this.getRlaForUser(userId);
    this.upateTaskStarPotential();
    this.rebuildOverviewDisplay();
    this.prepareInformationExtractionDisplay();
    if (this.userIcons.length > 5) {
      const included = this.userIcons.slice(2).some(u => u.id == userId);
      for (const dropdown of this.userDropdownSelects) {
        dropdown.nativeElement.value = included ? userId : -1
      }
    }
    if (userId == this.GOLD_USER_ID && this.firstVisitGold) {
      this.modalGoldUser.nativeElement.checked = true;
      this.firstVisitGold = false;
    }
  }

  getRlaForUser(user): any[] {
    if (!this.rlaGroupMap) return [];
    let toReturn = [];
    if (this.rlaGroupMap.has(user)) {
      for (const rla of this.rlaGroupMap.get(user)) {
        toReturn.push(rla);
      }
    }

    if (this.rlaGroupMap.has("GLOBAL")) {
      for (const rla of this.rlaGroupMap.get("GLOBAL")) {
        toReturn.push(rla);
      }
    }

    return toReturn;
  }

  ensureTaskAllowed() {
    if (this.user.role != "ANNOTATOR") return;
    const a = {}
    for (const key in this.fullRecordData.tasks) {
      for (const task of this.fullRecordData.tasks[key]) {
        if (task.taskType != LabelingTask.NOT_SET) {
          if (task.id != this.huddleData.allowedTask) {
            task.taskType = LabelingTask.NOT_USEABLE;
          }
        }
      }
    }
    const globalTasksKey: string = '_gloabalTasks';
    if (this.fullRecordData.tasks[globalTasksKey]) {
      let found = false;
      for (const task of this.fullRecordData.tasks[globalTasksKey]) {
        if (task.taskType != LabelingTask.NOT_USEABLE && task.taskType != LabelingTask.NOT_SET) {
          found = true;
          break;
        }
      }
      if (!found) delete this.fullRecordData.tasks[globalTasksKey];
    }
  }

  addTaskToRecord() {
    this.fullRecordData.tasks = {};
    const globalTasksKey: string = '_gloabalTasks';
    for (const [key, task] of this.labelingTasksMap.entries()) {
      if (task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE) {
        if (!this.fullRecordData.tasks[task.attribute.name])
          this.fullRecordData.tasks[task.attribute.name] = [];
        this.fullRecordData.tasks[task.attribute.name].push(task);
      } else {
        if (!this.fullRecordData.tasks[globalTasksKey])
          this.fullRecordData.tasks[globalTasksKey] = [];
        this.fullRecordData.tasks[globalTasksKey].push(task);
      }
    }
    //set dummy entries to ensure loopability

    for (const key in this.fullRecordData.data) {
      if (!this.fullRecordData.tasks[key])
        this.fullRecordData.tasks[key] = [
          {
            name: 'DUMMY',
            taskTarget: LabelingTaskTarget.ON_ATTRIBUTE,
            taskType: LabelingTask.NOT_SET,
          },
        ];
    }
    if (this.fullRecordData.tasks[globalTasksKey]) {
      this.fullRecordData.data[globalTasksKey] = null;
    }
    //check if the task should display it's text
    for (const key in this.fullRecordData.data) {
      if (key == globalTasksKey) continue;
      const hasInformationExtraction = this.hasTaskArrayInformationExtraction(this.fullRecordData.tasks[key]);
      let firstTask: boolean = true;
      for (let task of this.fullRecordData.tasks[key]) {
        if (hasInformationExtraction) {
          task.showText = task.taskType == LabelingTask.INFORMATION_EXTRACTION;
        } else {
          task.showText = firstTask;
        }
        if (firstTask) firstTask = false;
      }
    }
  }

  hasTaskArrayInformationExtraction(taskArray: any[]): boolean {
    for (const task of taskArray) {
      if (task.taskType == LabelingTask.INFORMATION_EXTRACTION) return true;
    }
    return false;
  }

  applyColumnOrder() {
    if (this.sortOrder.length == 0 || !this.fullRecordData) return;
    this.fullRecordData.sortOrder = Array.from(this.sortOrder);

    // push adds last so tchnically not nessesary to have high nubmer but what gives :)
    if (this.fullRecordData.tasks['_gloabalTasks']) {
      this.fullRecordData.sortOrder.push({
        key: '_gloabalTasks',
        order: Number.MAX_VALUE,
      });
    }
  }

  addTokenDataToTask(tokenData) {
    for (let [key, value] of this.labelingTasksMap.entries()) {
      if (value.taskType == LabelingTask.INFORMATION_EXTRACTION) {
        value.tokenizedAttribute = this.getTokenizedAttribute(value.id, value.attribute.id, tokenData);
        if (!value.tokenizedAttribute) console.log("cant set labeling task attribute --this shouldn't happen")
      }
    }
  }

  prepareInformationExtractionDisplay(
    sourceToDisplay: LabelSource = LabelSource.MANUAL,
    sourceOverLay: LabelSource = LabelSource.WEAK_SUPERVISION
  ) {
    this.extendedDisplay = {};
    this.tokenOverlayData = {};
    this.resetTokenizedRecord();
    if (
      !this.hasTokenData() ||
      !this.fullRecordData ||
      !this.fullRecordData.recordLabelAssociations ||
      this.fullRecordData.recordLabelAssociations.length == 0
    )
      return;
    //set needed value
    for (let md of this.fullRecordData.recordLabelAssociations) {
      if (md.returnType == InformationSourceReturnType.RETURN) continue;
      const attributeId = md.labelingTaskLabel.labelingTask.attribute.id;
      const taskId = md.labelingTaskLabel.labelingTask.id;
      let att = this.getTokenizedAttribute(taskId, attributeId);
      let t1 = this.getToken(att, md.tokenStartIdx);
      let t2 = this.getToken(att, md.tokenEndIdx);
      md.value = att.raw.substring(t1.posStart, t2.posEnd);
    }

    for (let md of this.fullRecordData.recordLabelAssociations) {
      const task = this.labelingTasksMap.get(
        md.labelingTaskLabel.labelingTask.id
      );
      if (
        !task ||
        task.taskType != LabelingTask.INFORMATION_EXTRACTION ||
        md.tokenStartIdx == null
      )
        continue;
      if (md.sourceType != sourceToDisplay && md.sourceType != sourceOverLay)
        continue;
      const attributeId = md.labelingTaskLabel.labelingTask.attribute.id;
      let att = this.getTokenizedAttribute(task.id, attributeId);
      let key = task.id + '_' + md.tokenStartIdx;
      key = key + (md.sourceType == sourceOverLay ? '_OV' : '_SD');
      this.extendedDisplay[key] = this.buildExtendedDisplay(
        md,
        sourceOverLay,
        key,
        task.id
      );
      for (let i = md.tokenStartIdx; i <= md.tokenEndIdx; i++) {
        let token = this.getToken(att, i);
        token.addInfoKey = task.id + '_T' + String(token.idx).padStart(5, '0');
        this.extendedDisplay[key].token.push(token);
        if (md.sourceType == sourceToDisplay) token.extendDisplay = true;
        else {
          if (this.getSourceId() != null) continue;
          token.overlayDisplay = true;

          let overlayData = {
            token: token,
            group: key,
            isFirst: i == md.tokenStartIdx,
            isLast: i == md.tokenEndIdx,
            labelName: md.labelingTaskLabel.name,
            labelId: md.labelingTaskLabel.id,
            labelDisplay: this.getLabelForDisplay(
              md.labelingTaskLabel.name,
              md.confidence
            ),
            labelColor: md.labelingTaskLabel.color
          };

          if (this.tokenOverlayData[token.addInfoKey])
            this.tokenOverlayData[token.addInfoKey].push(overlayData);
          else this.tokenOverlayData[token.addInfoKey] = [overlayData];
          this.tokenOverlayData[token.addInfoKey].taskId = task.id;
        }
      }
    }

    //remember which extended has overlay inside
    for (let ed in this.extendedDisplay) {
      let e = this.extendedDisplay[ed];
      if (e.isOverlay || e.token.length == 0) continue;
      for (let i = 0; i < e.token.length; i++) {
        if (e.token[i].overlayDisplay) {
          e.hasOverlay = true;
          break;
        }
      }
    }

    //set overlays know if extention is needed

    for (let md of this.fullRecordData.recordLabelAssociations) {
      if (md.sourceType != sourceToDisplay || (!md.tokenStartIdx && md.tokenStartIdx != 0)) continue;
      const attributeId = md.labelingTaskLabel.labelingTask.attribute.id;
      const taskId = md.labelingTaskLabel.labelingTask.id;
      let t = this.getToken(
        this.getTokenizedAttribute(taskId, attributeId),
        md.tokenEndIdx
      );
      if (this.tokenOverlayData[t.addInfoKey]) {
        for (let e of this.tokenOverlayData[t.addInfoKey]) {
          if (!e.isLast) {
            e.labelAddition = this.getLabelForDisplay(
              md.labelingTaskLabel.name,
              md.confidence
            );
          }
        }
      }
    }

    //sort by position to ensure right overlay order
    for (let key in this.tokenOverlayData) {
      this.tokenOverlayData[key].sort((a, b) => a.group.localeCompare(b.group));
    }
  }

  buildExtendedDisplay(markedData, sourceOverLay, key, taskId) {
    return {
      isOverlay: markedData.sourceType == sourceOverLay,
      markedEntry: markedData,
      key: key,
      taskId: taskId,
      labelDisplay: this.getLabelForDisplay(
        markedData.labelingTaskLabel.name,
        markedData.confidence
      ),
      labelColor: markedData.labelingTaskLabel.color,
      token: [],
    };
  }

  resetTokenizedRecord() {
    if (!this.hasTokenData()) return;
    for (let [key, value] of this.labelingTasksMap.entries()) {
      if (value.tokenizedAttribute?.token) {
        for (let tok of value.tokenizedAttribute.token) {
          if (tok.extendDisplay) delete tok.extendDisplay;
          if (tok.overlayDisplay) delete tok.overlayDisplay;
        }
      }
    }
  }

  deleteRecord() {
    this.recordApolloService.deleteRecordByRecordId(this.project.id, this.fullRecordData.id)
      .pipe(first()).subscribe((r) => {
        if (r['data']['deleteRecord']?.ok) {
          this.recordData = null;
          this.huddleData.recordIds[this.huddleData.linkData.requestedPos - 1] = "deleted"
          let jumpPos = this.huddleData.linkData.requestedPos + 1;
          if (jumpPos >= this.huddleData.recordIds.length) jumpPos -= 2;
          this.jumpToPosition(this.project.id, jumpPos);
        } else {
          console.log("Something went wrong with deletion of record:" + this.fullRecordData.id);
        }
      });
  }

  nextRecord() {
    this.huddleData.linkData.requestedPos++;
    this.jumpToPosition(this.project.id, this.huddleData.linkData.requestedPos);
  }
  previousRecord() {
    this.huddleData.linkData.requestedPos--;
    this.jumpToPosition(this.project.id, this.huddleData.linkData.requestedPos);
  }

  dataToClear(): boolean {
    if (!this.fullRecordData) return false;
    if (this.fullRecordData.recordLabelAssociations.length != 0) return true;
    for (let el of this.fullRecordData.recordLabelAssociations) {
      if (el.source == LabelSource.MANUAL) return true;
    }
    return false;
  }

  clearRecord() {
    if (this.fullRecordData.recordLabelAssociations.length > 0) {
      let associationIds = [];
      for (let el of this.fullRecordData.recordLabelAssociations) {
        if (el.sourceType == LabelSource.MANUAL) associationIds.push(el.id);
      }
      this.recordApolloService
        .deleteRecordLabelAssociationById(
          this.project.id,
          this.fullRecordData.id,
          associationIds
        ).pipe(first())
        .subscribe();
      this.overviewDisplay.length = 0;
    }
    window.getSelection().removeAllRanges();
  }

  getFirstItem(data) {
    return data[Object.keys(data)[0]];
  }

  toggleInformationSourceSwitch() {
    this.showInformationSourcesFlag = !this.showInformationSourcesFlag;
    this.rebuildOverviewDisplay();
  }

  toggleShowToken() {
    if (this.showTokenDisabled) return;
    this.showTokenFlag = !this.showTokenFlag;
  }

  atLeastOneInformationSource(arr): boolean {
    if (!arr) return false;
    for (let el of arr) {
      if (el.sourceType == LabelSource.INFORMATION_SOURCE) return true;
    }
    return false;
  }

  checkLabelBlinker(event: MouseEvent) {
    const target: HTMLElement = event.target instanceof HTMLElement ? event.target : null;
    if (this.isLabelBoxOpen && ((target && target.id != 'labelSearchText' && target.id != 'labelSearch') || !target)) {
      if (this.labelSearchBlinker.nativeElement.classList.contains('blink_me')) {
        if (this.isLabelSearchTextEmpty()) this.clearSearch();
        else this.labelSearchBlinker.nativeElement.classList.remove('blink_me');
      }
    }
  }


  //selection stuff
  @HostListener('document:mouseup', ['$event'])
  onMouseup(event: MouseEvent) {
    const target: HTMLElement = event.target instanceof HTMLElement ? event.target : null;
    if (!(this.isCommentBoxOpen && ((target && target.id == 'commentInput') || !target))) {
      this.isCommentBoxOpen = false;
    }
    if (!(this.displayUserId == this.GOLD_USER_ID || this.displayUserId == this.user.id)) return;
    this.checkLabelBlinker(event);
    //mouseup is fired before selection is updated --> wait 1 ms
    timer(1).subscribe(() => {
      this.handleNewMouseUp(event);
    });
  }

  handleNewMouseUp(event: MouseEvent) {
    let selection = window.getSelection();
    this.closeLabelBox();
    if (
      !selection ||
      selection.rangeCount == 0 ||
      selection.toString().trim().length == 0
    )
      return;

    const tmpRange = selection.getRangeAt(0);
    let idStart = tmpRange.startContainer.parentNode['id'];
    let idEnd = tmpRange.endContainer.parentNode['id'];
    if (!idStart || !idEnd) return;
    let posS = idStart.search('@@idx_'),
      posE = idEnd.search('@@idx_');
    if (posS == -1 || posE == -1) return;
    let taskId = idStart.substring(0, posS);
    if (taskId != idEnd.substring(0, posE)) return;
    if (!this.isInformationExtractionPossible(taskId)) return;
    var range = document.createRange();
    range.setStart(tmpRange.startContainer.parentNode, 0);
    range.setEnd(tmpRange.endContainer.parentNode, 1);

    selection.removeAllRanges();
    selection.addRange(range);

    this.selectionJSON = this.createSelectionJSON(
      selection,
      this.labelingTasksMap.get(taskId),
      { left: event.clientX, top: event.clientY }
    );
    const target = (event.target as HTMLElement);
    this.setLabelBoxPos(event.clientX, event.clientY + this.getSumScrollTop(target));
    if (this.activeTask && this.activeTask.id != taskId) this.clearSearch();
    this.activeTask = this.labelingTasksMap.get(taskId);
  }

  tokenMouseUp(event: MouseEvent, taskId) {
    if (!(event.target instanceof HTMLElement)) return;
    if (!(this.displayUserId == this.GOLD_USER_ID || this.displayUserId == this.user.id)) return;
    event.stopPropagation();

    timer(1).subscribe(() => {
      this.handleTokenMouseUp(event, taskId);
    });
  }
  handleTokenMouseUp(event: MouseEvent, taskId) {
    if (!(event.target instanceof HTMLElement)) return;
    var sel = window.getSelection();

    var range = document.createRange();
    if (sel.type == 'Range' && sel.toString().trim().length != 0) {
      this.handleNewMouseUp(event);
      return;
    } else {
      range.setStart(event.target, 0);
      range.setEnd(event.target, 1);
    }

    sel.removeAllRanges();
    sel.addRange(range);

    this.selectionJSON = this.createSelectionJSON(
      sel,
      this.labelingTasksMap.get(taskId),
      { left: event.clientX, top: event.clientY }
    );
    const target = (event.target as HTMLElement);
    this.setLabelBoxPos(event.clientX, event.clientY + this.getSumScrollTop(target));
    if (this.activeTask && this.activeTask.id != taskId) this.clearSearch();
    this.activeTask = this.labelingTasksMap.get(taskId);
  }

  createSelectionJSON(selection: Selection, task, labelBoxPos) {
    const range = selection.getRangeAt(0);

    let idStart = range.startContainer['id']; //will do task id now
    let idEnd = range.endContainer['id'];

    idStart = idStart.substring(idStart.search('@@idx_') + 6, idStart.length);
    idEnd = idEnd.substring(idEnd.search('@@idx_') + 6, idEnd.length);
    let jsonData: any = {
      attribute: task.tokenizedAttribute,
      startToken: this.getToken(task.tokenizedAttribute, idStart),
      endToken: this.getToken(task.tokenizedAttribute, idEnd),
      labelBoxPos: labelBoxPos,
      startNode: selection.getRangeAt(0).startContainer.parentNode,
      endNode: selection.getRangeAt(0).endContainer.parentNode,
    };
    return jsonData;
  }

  getToken(tokenizedAttribute, idx: number) {
    for (let token of tokenizedAttribute.token) {
      if (token.idx == idx) return token;
    }
    return null;
  }
  getTokenizedAttribute(taskId: string, attributeId: string, tokenData = null) {
    if (tokenData) {
      for (let att of tokenData.attributes) {
        if (att.attributeId == attributeId) return att;
      }
    } else {
      const task = this.labelingTasksMap.get(taskId);
      if (task.attribute.id != attributeId || !task.tokenizedAttribute) {
        console.log(
          "Tokenized Attribute cant be collected -- shouldn't happen -- check call order"
        );
        return null;
      }
      return task.tokenizedAttribute;
    }
    return null;
  }

  getGlobalStartPos(parentNode, currentNode, anchorOffset) {
    for (
      var child = parentNode.firstChild;
      child !== null;
      child = child.nextSibling
    ) {
      if (child == currentNode) break;
      anchorOffset += child.textContent.length;
    }
    return anchorOffset;
  }

  isThisTheLabelImLookingFor(name: string, index: Number, tasktype: LabelingTask): boolean {
    if (!this.labelSearchText) return true;
    if (this.isLabelSearchTextEmpty()) {
      if (tasktype == LabelingTask.INFORMATION_EXTRACTION) return true;
      return index >= this.showNLabelButton;
    }
    let text = this.labelSearchText.nativeElement.textContent
      .toString()
      .toLowerCase();
    return name.toLowerCase().indexOf(text) >= 0;
  }

  preventDefaultEvent(event: MouseEvent) {
    event.stopPropagation();

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  setLabelBoxPos(mouseX: number, mouserY: number) {
    let box = this.getBoxPosition(this.labelBox.nativeElement, mouseX, mouserY);

    this.labelBox.nativeElement.style.top = box.top + 'px';
    this.labelBox.nativeElement.style.left = box.left + 'px';
    this.isLabelBoxOpen = true;
  }

  isInformationExtractionPossible(taskId: string): boolean {
    const task = this.labelingTasksMap.get(taskId);
    if (!task) return false;
    return (
      task.attribute.dataType == 'TEXT' &&
      task.taskType == LabelingTask.INFORMATION_EXTRACTION
    );
  }

  extendRecordLabelAssociations(rlas) {
    rlas.forEach((entry) => {
      entry.sourceTypeText = labelSourceToString(entry.sourceType);
      if (!entry.createdBy || entry.createdBy == "NULL") {
        entry.createdBy = "NULL"
        entry.createdByShort = '##';
        entry.createdByName = 'NULL User';
      }
      else if (!entry.user?.firstName) {
        entry.createdByShort = '#*';
        entry.createdByName = 'Unkown User ID';
      } else {
        entry.createdByShort = entry.user.firstName[0] + entry.user.lastName[0];
        entry.createdByName = entry.user.firstName + ' ' + entry.user.lastName;
      }
      if (entry.sourceType == LabelSource.INFORMATION_SOURCE) {
        entry.dataTip =
          informationSourceTypeToString(entry.informationSource.type, true) +
          ': ' +
          entry.informationSource.name;
      } else {
        entry.dataTip = labelSourceToString(entry.sourceType);
      }
    });
  }

  findUserGoldTasks() {
    if (!this.labelingTasksMap) return;
    for (const user of this.userIcons) {
      if (user.id == this.GOLD_USER_ID) continue;
      if (!this.userTaskGold.has(user.id)) {
        this.userTaskGold.set(user.id, this.createEmptyTaskMap());
      }
      for (let [key, value] of this.labelingTasksMap.entries()) {
        this.setGoldStateForTask(value.labels, user.id,
          this.userTaskGold.get(user.id).get(key));
      }
    }

  }


  setGoldStateForTask(taskLabels: any[], userId: string, goldState: { hasGold: boolean, isGold: boolean }) {
    goldState.hasGold = false;
    goldState.isGold = false;

    if (this.rlaGroupMap.has(this.GOLD_USER_ID)) {
      for (const rla of this.rlaGroupMap.get(this.GOLD_USER_ID)) {
        if (taskLabels.some(l => l.id == rla.labelingTaskLabelId)) {
          goldState.hasGold = true;
          break;
        }
      }
    }
    if (goldState.hasGold) {
      goldState.isGold = this.rlaGroupsEqual(taskLabels, userId, this.GOLD_USER_ID);
    }
  }

  createEmptyTaskMap(): Map<string, { hasGold: boolean, isGold: boolean }> {
    let map = new Map<string, { hasGold: boolean, isGold: boolean }>();
    for (let [key, value] of this.labelingTasksMap.entries()) {
      map.set(key, { hasGold: false, isGold: false });
    }
    return map;
  }

  // rla groups are used to preorganize the data needed for the display
  // one group per user, one for gold and one for global (rla = record label associations)
  // gold is similar to a user group. globals are for Information sources & Weak supervision since they are relevant for all.
  // function getRlaForUser collectes the rla data needed for the user display (user + global)
  parseRlaToGroups(rlas) {

    this.rlaGroupMap = new Map<string, any[]>();
    this.userIcons = [];
    let loggedInUserHasRlas = false;
    for (const rla of rlas) {
      if (rla.isGoldStar) {
        if (!this.rlaGroupMap.has(this.GOLD_USER_ID)) {
          this.rlaGroupMap.set(this.GOLD_USER_ID, []);
          this.userIcons.push({ id: this.GOLD_USER_ID, order: 0, name: "Combined Gold Labels" });
        }
        this.rlaGroupMap.get(this.GOLD_USER_ID).push(rla);
      } else if (rla.sourceType != LabelSource.MANUAL) {
        if (!this.rlaGroupMap.has("GLOBAL")) { this.rlaGroupMap.set("GLOBAL", []); }
        this.rlaGroupMap.get("GLOBAL").push(rla);
      } else {
        if (!this.rlaGroupMap.has(rla.createdBy)) {
          this.rlaGroupMap.set(rla.createdBy, []);
          loggedInUserHasRlas = loggedInUserHasRlas || rla.createdBy == this.user.id;
          const avatarSelector = (rla.createdByShort.charCodeAt(0) + rla.createdByShort.charCodeAt(1)) % 5;
          this.userIcons.push({
            id: rla.createdBy,
            order: rla.createdBy == this.user.id ? 1 : 2,
            initials: rla.createdByShort,
            name: rla.createdByName,
            avatarUri: "assets/avatars/" + avatarSelector + ".png"
          });
        }
        this.rlaGroupMap.get(rla.createdBy).push(rla);
      }
    }
    if (!loggedInUserHasRlas) {
      const avatarSelector = (this.user.firstName[0].charCodeAt(0) + this.user.lastName[0].charCodeAt(0)) % 5;
      this.userIcons.push({
        id: this.user.id,
        order: 1,
        initials: this.user.firstName[0] + this.user.lastName[0],
        name: this.user.firstName + ' ' + this.user.lastName,
        avatarUri: "assets/avatars/" + avatarSelector + ".png"
      });

    }
    this.userIcons.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    //set hotkey info
    let c = 1;
    for (let userIcon of this.userIcons) {
      if (c == 10) break;
      userIcon.name += ' [' + c++ + ']'
    }

  }

  toggleGoldStar(taskId: string, goldState: { hasGold: boolean, isGold: boolean }) {
    if (goldState.isGold) {
      this.removeTaskAsGoldStar(taskId, goldState);
    } else {
      this.selectTaskAsGoldStar(taskId, this.displayUserId, goldState);
    }
  }

  selectTaskAsGoldStar(taskId: string, goldUserId: string, goldState: { hasGold: boolean, isGold: boolean }) {
    if (!this.fullRecordData) return;
    this.somethingLoading = true;
    this.recordApolloService.setGoldStarAnnotationForTask(this.project.id, this.fullRecordData.id, taskId, goldUserId)
      .pipe(first()).subscribe((r) => {
        if (r.data.setGoldStarAnnotationForTask.ok) goldState.isGold = true;
      });
  }

  removeTaskAsGoldStar(taskId: string, goldState: { hasGold: boolean, isGold: boolean }) {
    if (!this.fullRecordData) return;
    this.somethingLoading = true;
    this.recordApolloService.removeGoldStarAnnotationForTask(this.project.id, this.fullRecordData.id, taskId)
      .pipe(first()).subscribe((r) => {
        if (r.data.removeGoldStarAnnotationForTask.ok) goldState.isGold = false;
      });
  }


  rebuildOverviewDisplay() {
    if (!this.fullRecordData.id) return;
    if (this.showInformationSourcesFlag) {
      this.overviewDisplay = Array.from(
        this.fullRecordData.recordLabelAssociations
      );
    } else {
      this.overviewDisplay = Array.from(
        this.fullRecordData.recordLabelAssociations.filter(
          (e) => e.sourceType != LabelSource.INFORMATION_SOURCE
        )
      );
    }
    for (let e of this.overviewDisplay) {
      const utcDate = dateAsUTCDate(new Date(e.createdAt));
      e.createdAtText = utcDate.toLocaleString();
      if (e.sourceType == LabelSource.INFORMATION_SOURCE) {
        e.createdByName = e.informationSource.name;
        e.sourceTypeText = informationSourceTypeToString(
          e.informationSource.type,
          false
        );
      }
    }
    //TODO allow custom sort (e.g. by creation time)
    this.overviewDisplay.sort((a, b) => this.calcSortOverview(a, b));
  }

  private calcSortOverview(a, b): number {
    let aRPos = a.labelingTaskLabel.labelingTask.attribute?.relativePosition;
    let bRPos = b.labelingTaskLabel.labelingTask.attribute?.relativePosition;
    if (!aRPos) aRPos = Number.MAX_VALUE;
    if (!bRPos) bRPos = Number.MAX_VALUE;
    return aRPos - bRPos || a.tokenStartIdx - b.tokenStartIdx;
  }

  saveComment() {
    if (!this.commentMarkedData) return;
    if (this.commentMarkedData.comment == this.commentForm.value) return;

    console.log('comments currently disabled');
    return;
    this.commentMarkedData.comment = this.commentForm.value;
    this.isCommentBoxOpen = false;
    this.recordApolloService
      .changeRecordLabelAssociationComment(
        this.project.id,
        this.fullRecordData.id,
        this.commentMarkedData.nerId,
        this.commentForm.value.trim()
      ).pipe(first())
      .subscribe();
  }

  escapeComment() {
    this.commentMarkedData = null;
    this.isCommentBoxOpen = false;
  }

  setCommentBoxPos(event: MouseEvent) {
    let box = this.getBoxPosition(
      this.commentBox.nativeElement,
      event.clientX,
      event.clientY
    );

    this.commentBox.nativeElement.style.top = box.top + 'px';
    this.commentBox.nativeElement.style.left = box.left + 'px';
    this.isCommentBoxOpen = true;
  }

  getBoxPosition(targetElement: Element, mouseX, mouseY) {
    //base values
    let targetBoxLeft = mouseX + window.scrollX;
    let targetBoxTop = mouseY + window.scrollY + 20;

    //check if labelbox appears outside right bound of the data div
    let dataBoundingBox: DOMRect =
      this.dataBlock.nativeElement.getBoundingClientRect();
    let targetBoundingBox: DOMRect = targetElement.getBoundingClientRect();
    let rightBorderData = dataBoundingBox.x + dataBoundingBox.width;

    let rightBorderLabel = targetBoxLeft + targetBoundingBox.width;

    if (rightBorderLabel > rightBorderData)
      targetBoxLeft -= rightBorderLabel - rightBorderData;

    //base offset
    let baseDomElementBoundingBox: DOMRect =
      this.baseDomElement.nativeElement.getBoundingClientRect();
    targetBoxLeft -= baseDomElementBoundingBox.left;
    targetBoxTop -= baseDomElementBoundingBox.top;

    return { left: targetBoxLeft, top: targetBoxTop };
  }

  deleteRecordLabelAssociation(event: MouseEvent, associationId: string) {
    event.stopPropagation();
    this.somethingLoading = true;
    this.recordApolloService
      .deleteRecordLabelAssociationById(
        this.project.id,
        this.fullRecordData.id,
        [associationId]
      ).pipe(first())
      .subscribe();
    if (this.user.id != this.displayUserId) {
      if (this.fullRecordData.recordLabelAssociations.length == 0 ||
        (this.fullRecordData.recordLabelAssociations.length == 1 && this.fullRecordData.recordLabelAssociations[0].id == associationId)) {
        this.showUserData(this.user.id);
      }
    }
  }

  addLabelToMarkedText(taskId: string, labelId: string) {
    if (!this.selectionJSON) return;
    if (this.selectionJSON.error) return;
    if (this.roleAssumed || !this.huddleData.canEdit) return;

    //saveData
    this.somethingLoading = true;

    let dataEntry = {
      startIdx: this.selectionJSON.startToken.idx,
      endIdx: this.selectionJSON.endToken.idx,
      value: this.selectionJSON.attribute.raw.substring(
        this.selectionJSON.startToken.posStart,
        this.selectionJSON.endToken.posEnd
      ),
    };

    this.closeLabelBox();
    window.getSelection().removeAllRanges();
    this.recordApolloService
      .addExtractionLabelToRecord(
        this.project.id,
        this.fullRecordData.id,
        taskId,
        dataEntry.startIdx,
        dataEntry.endIdx,
        dataEntry.value,
        labelId,
        this.displayUserId == this.GOLD_USER_ID ? true : null,
        this.getSourceId()
      )
      .pipe(first())
      .subscribe();

  }


  addLabelToTask(labelingTaskId: string, labelId: string) {
    if (this.roleAssumed || !this.huddleData.canEdit) return;
    let existingLabels = this.fullRecordData.recordLabelAssociations.filter(
      (e) => e.sourceType == LabelSource.MANUAL && e.labelingTaskLabel.labelingTask.id == labelingTaskId
    );
    if (existingLabels.length == 1 && existingLabels[0].labelingTaskLabelId == labelId) return;

    this.somethingLoading = true;
    //add new
    this.recordApolloService
      .addClassificationLabelsToRecord(
        this.project.id,
        this.fullRecordData.id,
        labelingTaskId,
        labelId,
        this.displayUserId == this.GOLD_USER_ID ? true : null,
        this.getSourceId(),
      )
      .pipe(first())
      .subscribe();

    if (this.autoNextRecord) {
      this.nextRecord();
    }

    this.closeLabelBox();
  }

  openLabelBoxForTask(event: MouseEvent, taskId: string) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.selectionJSON = null;
    window.getSelection().removeAllRanges();

    const target = (event.target as HTMLElement);
    this.setLabelBoxPos(event.clientX, event.clientY + this.getSumScrollTop(target));

    if (this.activeTask && this.activeTask.id != taskId) this.clearSearch();
    this.activeTask = this.labelingTasksMap.get(taskId);
  }

  getSumScrollTop(element: HTMLElement): number {
    let v = element.scrollTop;
    let parent = element.parentElement;
    while (parent) {
      v += parent.scrollTop;
      parent = parent.parentElement;
    }

    return v;
  }

  closeLabelBox() {
    this.isLabelBoxOpen = false;
    this.selectionJSON = null;
    if (this.isLabelSearchTextEmpty()) this.clearSearch();
  }

  createLabelFromSearchBox(event: MouseEvent) {
    event.preventDefault();
    if (this.disableLabelAddButton()) return;
    let labelName = this.labelSearchText.nativeElement.textContent.toString();
    if (labelName.length > 0) {
      this.projectApolloService
        .createLabel(this.project.id, this.activeTask.id, labelName, "yellow")
        .pipe(first())
        .subscribe();
    }
  }

  disableLabelAddButton(): boolean {
    if (!this.labelSearchText || !this.activeTask || this.isLabelSearchTextEmpty()) return true;
    let labelName = this.labelSearchText.nativeElement.textContent
      .toString()
      .toLowerCase();

    for (const [key, value] of this.activeTask.labels.entries()) {
      if (value.name.toLowerCase() == labelName) return true;
    }
    return false;
  }

  getTaskLabels(taskId: string) {
    if (!this.fullRecordData) return [];
    let found = [];
    for (let rla of this.fullRecordData.recordLabelAssociations) {
      if (
        rla.labelingTaskLabel.labelingTask.id == taskId &&
        rla.sourceType != LabelSource.INFORMATION_SOURCE
      )
        found.push(rla);
    }
    return found;
  }

  getNgStyleForLabeledToken(
    showTokenFlag: boolean,
    i: number,
    lastToken: boolean
  ) {
    let style = {};
    if (showTokenFlag) style['outline'] = '2px solid #FBBF24';
    if (i == 0) {
      style['border-left-width'] = '1px';
      style['border-top-left-radius'] = '10px';
      style['border-bottom-left-radius'] = '10px';
    } else {

      style['border-left-width'] = '0px';
    }
    style['border-right-width'] = '0px';
    if (lastToken) {
      style['padding-right'] = '.25rem';
    }
    return style;
  }
  getNgStyleForOverlayBase(
    overlayData,
    isInner,
    isFirstInner,
    labelExtentionOverlay = false
  ) {
    let extendDisplay = overlayData.token.extendDisplay;
    let isFirstInAttribute = overlayData.isFirst && overlayData.token.idx == 0;
    let style = {};
    style['bottom'] = isInner ? '10px' : '12px';
    //if (!extendDisplay) {
    style['padding'] = '2px';
    style['padding-bottom'] = '0';
    style['left'] = isFirstInAttribute
      ? '-2px'
      : overlayData.token.previousCloser
        ? '3px'
        : '1px';

    style['border-left-width'] = '0px';
    style['border-right-width'] = '0px';
    if (overlayData.isFirst && !labelExtentionOverlay) {
      style['padding-left'] = '0px'; //to counteract border
      style['border-top-left-radius'] = '10px';
      style['border-bottom-left-radius'] = '10px';
      style['border-left-width'] = '2px';
    }
    if (overlayData.isLast) {
      style['border-top-right-radius'] = '10px';
      style['border-bottom-right-radius'] = '10px';
      style['border-right-width'] = '2px';
    }
    if (overlayData.token.diffToLastPos == 0) {
      style['padding-right'] = '0px'; //to counteract ml-1
    }
    if (overlayData.token.previousCloser) {
      style['padding-right'] = '0px'; //to counteract ml-1 & diff
    }
    if (labelExtentionOverlay) {
      style['padding-right'] = '2px'; //8px //to concider padding and svg bounds
      style['left'] = '-3px'; //-9
    }
    if (isFirstInner) {
      style['padding-right'] = '8px'; //to concider concider extention block padding & border
    }

    //}
    return style;
  }

  getLabelForDisplay(labelName: string, confidence: number) {
    return (
      labelName +
      (confidence || confidence == 0
        ? ' - ' + Math.round((confidence + Number.EPSILON) * 10000) / 100 + '%'
        : '')
    );
  }

  displayEntryAsJSON(dataEntry, like = '') {
    if (like != '')
      return JSON.stringify(
        dataEntry,
        (key, value) =>
          key.toLowerCase().includes(like) || key.length == 0
            ? value
            : undefined,
        2
      );
    return JSON.stringify(dataEntry, null, 2);
  }


  handleWebsocketNotification(msgParts) {
    if (['label_created', 'label_deleted'].includes(msgParts[1])) {
      this.labelingTasksQuery$.refetch();
    } else if (['labeling_task_deleted', 'labeling_task_created'].includes(msgParts[1])) {
      this.refreshTaskAndDo(() => {
        this.userTaskGold.clear();
        this.prepareFullRecord();
        this.prepareInformationExtractionDisplay();
      });
    } else if (msgParts[1] == 'labeling_task_updated') {
      if (msgParts[3] != this.labelingTasksMap.get(msgParts[2]).taskType) {
        this.refreshTaskAndDo(() => {
          this.getTokenizedRecord(this.recordData?.id, true);
        });

      } else {
        this.labelingTasksQuery$.refetch();
      }
    } else if (['payload_finished', 'weak_supervision_finished'].includes(msgParts[1])) {
      this.recordLabelAssociationsQuery$.refetch();
    } else if (['rla_created', 'rla_deleted'].includes(msgParts[1])) {
      if (msgParts[2] == this.fullRecordData?.id) {
        this.recordLabelAssociationsQuery$.refetch();
      }
    }
    else if (msgParts[1] == 'record_deleted') {
      if (msgParts[2] == this.recordData?.id) {
        this.huddleData.recordIds[this.huddleData.linkData.requestedPos - 1] = "deleted"
        this.jumpToPosition(this.project.id, this.huddleData.linkData.requestedPos);
      }
    } else if (msgParts[1] == 'attributes_updated') {
      this.attributesQuery$.refetch();
    }
  }

  refreshTaskAndDo(func: () => void) {
    //usual fork join doesn't work so small own logic to prevent load of rla before done
    this.labelingTaskWait = true;
    this.labelingTasksQuery$.refetch();
    let intervallTimer = interval(250).subscribe(() => {
      if (!this.labelingTaskWait) {
        func.call(this);
        intervallTimer.unsubscribe();
      }
    })
  }

  goToRecordIde() {
    const sessionId = this.labelingLinkData.id;
    const pos = this.labelingLinkData.requestedPos;
    // const recordIdeUrlFull = this.activatedRoute.snapshot['_routerState'].url;
    // const posIndex = /\?pos/.exec(recordIdeUrlFull).index;
    // const position = parseInt(recordIdeUrlFull.substring(posIndex + 5)); // get rid of "?pos=" (5 chars)

    this.router.navigate(["projects", this.project.id, "record-ide", sessionId], { queryParams: { pos: pos } });
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

  getLeftMargin(innerToken, i) {
    if (innerToken.diffToLastPos > 0 && i == 0) {
      return 'ml-1'
    }
    return "ml-0"
  }

  toggleAutoJumpNextRecord() {
    this.autoNextRecord = !this.autoNextRecord;
    localStorage.setItem("autoNextRecord", "" + this.autoNextRecord);
  }
}
