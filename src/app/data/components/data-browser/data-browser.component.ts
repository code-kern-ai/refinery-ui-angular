import {
  Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { KeyValue } from '@angular/common';
import { combineLatest, forkJoin, interval, Observable, Subscription, timer } from 'rxjs';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import {
  debounceTime,
  distinctUntilChanged,
  first,
  map,
  pairwise,
  startWith,
} from 'rxjs/operators';
import {
  InformationSourceType,
  informationSourceTypeToString,
  LabelingTaskTarget,
  LabelSource,
  labelSourceToString,
} from 'src/app/base/enum/graphql-enums';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { schemeCategory24 } from 'src/app/util/colors';
import { DataBrowserFilterParser } from './helper-classes/filter-parser';
import {
  getBasicGroupItems,
  getBasicSearchGroup as getBasicSearchGroupContainer,
  getBasicSearchItem,
  getSearchOperatorTooltip,
  SearchGroupElement,
  SearchGroupItem,
  SearchGroup,
  SearchInfo,
  SearchItemType,
  SearchOperator,
  StaticOrderByKeys,
  Slice,
  getDescriptionForSliceType,
} from './helper-classes/search-parameters';
import { SimilarSearch } from './helper-classes/search-similar';
import { UserFilter } from './helper-classes/user-filter';
import { DownloadState } from 'src/app/import/services/s3.enums';


type DataSlice = {
  id: string;
  name: string;
  filterRaw: any;
  initFilterRaw?: any;
  filterData: string; // is a JSONstring and gets parsed when applied
  static: boolean;
  count: number;
  sql: string;
  createdAt: string;
  createdBy: string;
  sliceType: string;
  info: string; // is a JSONstring and gets parsed when applied
};
type CurrentSearchRequest = {
  callerName: string,
  variables: {
    projectId: string,
    filterData?: string[],
    sliceId?: string,
    orderBy?: string,
    embeddingId?: string,
    recordId?: string,
    offset?: number,
    limit?: number,
  }
  func: (variables) => any
};
@Component({
  selector: 'kern-data-browser',
  templateUrl: './data-browser.component.html',
  styleUrls: ['./data-browser.component.scss'],
  styles: [],
})
export class DataBrowserComponent implements OnInit, OnDestroy {
  get LabelSourceType(): typeof LabelSource {
    return LabelSource;
  }
  get SearchGroupType(): typeof SearchGroup {
    return SearchGroup;
  }
  get StaticOrderByKeysType(): typeof StaticOrderByKeys {
    return StaticOrderByKeys;
  }
  get SliceTypes(): typeof Slice {
    return Slice;
  }

  @ViewChildren('searchGroup', { read: ElementRef }) searchGroupsHTML: QueryList<ElementRef>;

  static seedCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  project$: any;
  projectId: string;
  attributesQuery$: any;
  attributes: Map<string, any> = new Map<string, any>();
  attributesSortOrder = [];

  labelingTaskWait: { isWaiting: boolean } = { isWaiting: false };
  attributeWait: { isWaiting: boolean } = { isWaiting: false };
  tasks: Map<string, any> = new Map<string, any>();
  tasksSortOrder = [];

  searchMap: Map<string, SearchInfo> = new Map<string, SearchInfo>();

  loading = true;
  isSearchMenuOpen: boolean = true;
  isSearchMenuVisible: boolean = true;
  timerSubscribtion;

  allOrderByGroups: Map<string, FormGroup> = new Map<string, FormGroup>();
  searchGroups: Map<string, SearchGroupElement>;
  searchGroupOrder: { order: number; key: string }[] = [];

  groupValueChangesSubscribtion$ = [];

  colors = schemeCategory24;
  searchOperatorDropdownArray = [];
  globalSearchGroupCount = 0;

  extendedRecords;

  downloadMessage: DownloadState = DownloadState.NONE;
  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }

  isStaticDataSlice: boolean = false;
  staticSliceOrderActive: string;
  staticDataSliceCurrentCount: number;
  dataSlices$: Observable<DataSlice[]>;
  dataSlicesQuery$: any;
  labelingTasksQuery$: any;
  slicesById: Map<string, DataSlice> = new Map();
  sliceNames: Set<string> = new Set();
  filteredSliceIds: Set<string> = new Set();
  activeSlice: DataSlice = null;
  dataSliceFilter: string = "";
  lastActiveSliceId: string = ""; // used for activating correct slice after refetching
  sliceNameExists: boolean = false;
  sliceInfo = {};
  anyRecordManuallyLabeled: boolean = false;
  initializingFilter: Boolean = false;
  displayOutdatedWarning: Boolean = false;
  displayChangedValuesWarning: Boolean = false;
  displayStaticNotAllowedWarning: Boolean = false;

  subscriptions$: Subscription[] = [];

  lastSearchParams;
  highlightText: boolean = true;
  weakSupervisionRelated: boolean = false;
  isTextHighlightNeeded: Map<string, boolean> = new Map<string, boolean>();
  textHighlightArray: Map<string, string[]> = new Map<string, string[]>();

  activeSearchParams = [];
  requestedRecordCategory = "SCALE";
  requestedDrillDown: boolean = false;

  fullSearch: Map<string, FormGroup> = new Map<string, FormGroup>();

  sortOrderPreviousValues: any;
  similarSearchHelper: SimilarSearch;
  filterParser: DataBrowserFilterParser;

  userFilter: UserFilter;

  currentSearchRequest: CurrentSearchRequest;

  alertLastVisible: number;

  getSearchFormArray(groupKey: string): FormArray {
    return this.fullSearch.get(groupKey).get('groupElements') as FormArray;
  }

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private recordApolloService: RecordApolloService,
    private organizationApolloService: OrganizationApolloService,
    public formBuilder: FormBuilder
  ) { }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.projectId)
  }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);

    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.project$ = this.projectApolloService.getProjectById(this.projectId);
    this.similarSearchHelper = new SimilarSearch(this, this.recordApolloService, this.projectApolloService);
    this.similarSearchHelper.refreshEmbeddings();
    this.refreshAnyRecordManuallyLabeled(this.projectId);
    this.filterParser = new DataBrowserFilterParser(this);
    this.userFilter = new UserFilter(this, this.organizationApolloService);

    let preparationTasks$ = [];
    preparationTasks$.push(this.userFilter.prepareUserRequest());
    preparationTasks$.push(this.prepareAttributeRequest());
    preparationTasks$.push(this.prepareLabelingTaskRequest());
    forkJoin([...preparationTasks$])
      .pipe(first())
      .subscribe((results) => {
        this.prepareSearchGroups();
        this.loading = true;
        this.requestExtendedSearch();
      });
    this.prepareDataSlicesRequest();

    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['label_created', 'label_deleted', 'attributes_updated'];
    toReturn.push(...['labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created']);
    toReturn.push(...['information_source_created', 'information_source_updated', 'information_source_deleted']);
    toReturn.push(...['data_slice_created', 'data_slice_updated', 'data_slice_deleted']);
    toReturn.push(...this.similarSearchHelper.getWebsocketWhitelist());
    return toReturn;
  }

  prepareDataSlicesRequest() {
    let tmp$;
    [this.dataSlicesQuery$, tmp$] = this.projectApolloService.getDataSlices(this.projectId);
    this.dataSlices$ = tmp$.pipe(
      map((items: DataSlice[]) => {
        this.sliceNames = new Set();
        this.slicesById = new Map();
        this.filterAvailableSlices();
        items.forEach(item => {
          this.slicesById.set(item.id, item);
          this.sliceNames.add(item.name);
        });
        if (this.lastActiveSliceId != "") {
          this.activeSlice = this.slicesById.get(this.lastActiveSliceId);
          if (this.activeSlice && this.activeSlice.static) this.refreshStaticSliceCount(this.activeSlice.id)
          this.lastActiveSliceId = "";
        }
        return items;
      })
    );
  }

  prepareAttributeRequest(): Observable<any> {
    let vc$;
    [this.attributesQuery$, vc$] = this.projectApolloService.getAttributesByProjectId(this.projectId);
    let firstReturn$ = vc$.pipe(first());

    this.subscriptions$.push(vc$.subscribe((attributes) => {
      attributes.sort((a, b) => a.relativePosition - b.relativePosition);
      this.attributes.clear();
      this.attributesSortOrder = [];
      attributes.forEach((att) => {
        this.attributes.set(att.id, att);
        this.attributesSortOrder.push({
          key: att.id,
          order: att.relativePosition,
        });
      });
      this.attributeWait.isWaiting = false;
    }));
    return firstReturn$;
  }

  prepareLabelingTaskRequest(): Observable<any> {
    let vc$;
    [this.labelingTasksQuery$, vc$] = this.projectApolloService.getLabelingTasksByProjectId(this.projectId);
    let firstReturn$ = vc$.pipe(first());

    this.subscriptions$.push(vc$.subscribe((tasks) => {
      tasks.sort((a, b) => a.relativePosition - b.relativePosition);
      this.tasks.clear();
      this.tasksSortOrder = [];
      tasks.forEach((task) => {
        this.tasks.set(task.id, task);
        this.tasksSortOrder.push({
          key: task.id,
          order: task.relativePosition,
        });
      });
      this.labelingTaskWait.isWaiting = false;
    }));
    return firstReturn$;
  }

  groupSortOrder: number = 0;

  addSearchGroupItem(lastGroup: FormGroup, parentHTML: HTMLElement = null) {
    let item = getBasicSearchItem(
      lastGroup.get('type').value,
      lastGroup.get('groupKey').value
    );
    let group = this._attributeCreateSearchGroup(item);
    this.getSearchFormArray(lastGroup.get('groupKey').value).push(group);
    if (parentHTML) {
      parentHTML.style.setProperty(
        'max-height',
        parentHTML.scrollHeight + 100 + 'px'
      );
    }

    this.searchGroups.get(lastGroup.get('groupKey').value).inOpenTransition =
      true;

    return group;
  }

  removeSearchGroupItem(groupKey, id, emitEvent = true) {
    let index = this.getSearchFormArray(groupKey).value.findIndex(
      (g) => g.id === id
    );
    const activeElement =
      this.getSearchFormArray(groupKey).controls[index].get('active');
    if (activeElement.value) {
      activeElement.setValue(false, { emitEvent: emitEvent });
    }
    this.getSearchFormArray(groupKey).removeAt(index);
  }

  prepareSearchGroups() {
    //tasks or attributes not yet ready
    if (!this.attributes || !this.tasks) {
      console.log('preparation before data collected --> should not happen');
      return;
    }

    this.searchGroupOrder.length = 0;
    this.searchGroups = new Map<string, SearchGroupElement>();

    //Record Category    
    this.fullSearch.set(
      "RECORD_CATEGORY",
      this.formBuilder.group({ CATEGORY: "SCALE" })
    );
    //Drill Down
    const group = this.formBuilder.group({ DRILL_DOWN: false });
    group.valueChanges.subscribe(() => this.refreshSearchParamText());
    this.fullSearch.set("DRILL_DOWN", group);

    //attributes
    let searchGroupContainer;
    searchGroupContainer = getBasicSearchGroupContainer(
      SearchGroup.ATTRIBUTES,
      (this.groupSortOrder += 100)
    );
    this.searchGroups.set(searchGroupContainer.key, searchGroupContainer);
    this.fullSearch.set(
      searchGroupContainer.key,
      this.formBuilder.group({ groupElements: this.formBuilder.array([]) })
    );
    for (let baseItem of getBasicGroupItems(
      searchGroupContainer.group,
      searchGroupContainer.key
    )) {
      this.getSearchFormArray(searchGroupContainer.key).push(
        this._attributeCreateSearchGroup(baseItem)
      );
    }
    this.userFilter.addSearchGroup();

    //tasks
    for (let t of this.tasksSortOrder) {
      const task = this.tasks.get(t.key);
      searchGroupContainer = getBasicSearchGroupContainer(
        SearchGroup.LABELING_TASKS,
        (this.groupSortOrder += 100),
        task.name,
        task.id
      );
      this.searchGroups.set(searchGroupContainer.key, searchGroupContainer);
      this.fullSearch.set(
        searchGroupContainer.key,
        this.formBuilder.group({ groupElements: this.formBuilder.array([]) })
      );
      for (let baseItem of getBasicGroupItems(
        searchGroupContainer.group,
        searchGroupContainer.key
      )) {
        this.getSearchFormArray(searchGroupContainer.key).push(
          this._labelingTaskCreateSearchGroup(baseItem, task)
        );
      }
    }

    //order by
    searchGroupContainer = getBasicSearchGroupContainer(
      SearchGroup.ORDER_STATEMENTS,
      (this.groupSortOrder += 100)
    );
    this.searchGroups.set(searchGroupContainer.key, searchGroupContainer);
    this.fullSearch.set(
      searchGroupContainer.key,
      this.formBuilder.group({ groupElements: this.formBuilder.array([]) })
    );
    for (let baseItem of getBasicGroupItems(
      searchGroupContainer.group,
      searchGroupContainer.key
    )) {
      this.getSearchFormArray(searchGroupContainer.key).push(
        this._orderByCreateSearchGroup(baseItem)
      );
    }

    //debounce
    let tasks$ = [];
    for (let [key, value] of this.fullSearch) {
      tasks$.push(value.valueChanges.pipe(startWith('')));
    }
    combineLatest(tasks$)
      .pipe(debounceTime(500))
      .subscribe((results) => {
        if (!this.similarSearchHelper.recordsRequested) {
          this.requestExtendedSearch();
        }
      });

    //sort
    for (let [key, value] of this.searchGroups) {
      this.searchGroupOrder.push({ order: value.sortOrder, key: value.key });
    }
    this.searchGroupOrder.sort((a, b) => a.order - b.order);
  }

  _orderByCreateSearchGroup(item: SearchGroupItem): FormGroup {
    let group = this.formBuilder.group({
      id: ++this.globalSearchGroupCount,
      group: item.group,
      groupKey: item.groupKey,
      type: item.type,
      name: item.defaultValue,
      addText: item.addText,
      orderBy: this._orderByFormArray(),
      updateDummy: true
    });

    this.groupValueChangesSubscribtion$.push(group.valueChanges
      .pipe(distinctUntilChanged(), startWith(''))
      .subscribe((values) => this._sortOrderSearchGroupItemChanged(group, values)));

    // to ensure pairwise works as exprected
    group.get("updateDummy").setValue(false);
    return group;
  }


  private _sortOrderSearchGroupItemChanged(
    group: FormGroup,
    next
  ) {
    if (!this.sortOrderPreviousValues) {
      this.sortOrderPreviousValues = group.getRawValue();
      return;
    }
    if (next.updateDummy) {
      group.get("updateDummy").setValue(false, { emitEvent: false });
      return;
    }

    let values = group.getRawValue();
    let updatedValues = {};
    this.getUpdatedValues(group, this.sortOrderPreviousValues, values, updatedValues);
    this.onlyKeepUpdatedGroup(group, updatedValues);
    values = group.getRawValue();
    values.active = this.anyOrderActive(values);
    this.refreshSearchParams(values);
    if (!values.active) this.staticSliceOrderActive = "";
    if (this.activeSlice?.static && this.activeSlice?.sliceType != this.SliceTypes.STATIC_OUTLIER) {
      this.requestExtendedSearchByStaticSlice();
    }

    this.sortOrderPreviousValues = values;
  }

  private anyOrderActive(values): boolean {
    for (const element of values.orderBy) {
      if (element.active) return true;
    }
    return false;
  }
  private _orderByBuildSearchParamText(values): string {
    let text = '';
    for (const element of values.orderBy) {
      if (element.active) {
        if (text) text += "\n";
        else text = "ORDER BY "
        text += element.displayName;
        if (element.displayName != this._getOrderByDisplayName(StaticOrderByKeys.RANDOM)) {
          text += (element.direction == 1 ? ' ASC' : ' DESC');
        } else {
          text += ' (seed:' + element.seedString + ')';
        }
      }
    }
    return text;
  }

  public onlyKeepUpdatedGroup(formItem: FormGroup | FormArray | FormControl, updatedValues: any,
    name?: string) {

    if (formItem instanceof FormControl) {
      if (name && name == 'active') {
        formItem.setValue(false, { emitEvent: false });
      }
    } else {
      for (const formControlName in formItem.controls) {
        if (formItem.controls.hasOwnProperty(formControlName)) {
          const formControl = formItem.controls[formControlName];

          if (formControl instanceof FormControl) {
            this.onlyKeepUpdatedGroup(formControl, updatedValues, formControlName);
          } else if (
            formControl instanceof FormArray &&
            formControl.controls.length > 0
          ) {
            this.onlyKeepUpdatedGroup(formControl, updatedValues[formControlName]);
          } else if (formControl instanceof FormGroup
            && Object.keys(updatedValues[formControlName]).length == 0
          ) {
            this.onlyKeepUpdatedGroup(formControl, updatedValues[formControlName]);
          }
        }
      }
    }
    if (formItem instanceof FormGroup && formItem.contains("updateDummy")) {
      formItem.get("updateDummy").setValue(true)
    }
  }


  public getUpdatedValues(
    formItem: FormGroup | FormArray | FormControl,
    previousValues: any,
    currentValues: any,
    updatedValues: any,
    name?: string
  ) {
    if (formItem instanceof FormControl) {
      if (name && previousValues[name] != currentValues[name]) {
        updatedValues[name] = formItem.value;
      }
    } else {
      for (const formControlName in formItem.controls) {
        if (formItem.controls.hasOwnProperty(formControlName)) {
          const formControl = formItem.controls[formControlName];

          if (formControl instanceof FormControl) {
            this.getUpdatedValues(formControl, previousValues, currentValues, updatedValues, formControlName);
          } else if (
            formControl instanceof FormArray &&
            formControl.controls.length > 0
          ) {
            updatedValues[formControlName] = [];
            this.getUpdatedValues(formControl, previousValues[formControlName], currentValues[formControlName], updatedValues[formControlName]);
          } else if (formControl instanceof FormGroup) {
            updatedValues[formControlName] = {};
            this.getUpdatedValues(formControl, previousValues[formControlName], currentValues[formControlName], updatedValues[formControlName]);
          }
        }
      }
    }
  }

  _orderByFormArray(): FormArray {
    let array = this.formBuilder.array([]);
    for (let i = 0; i < this.attributesSortOrder.length; i++) {
      array.push(this.getOrderByGroup(this.attributes.get(this.attributesSortOrder[i].key).name, true, -1)) //1, //-1 desc, 1 asc     
    }
    array.push(this.getOrderByGroup(StaticOrderByKeys.CONFIDENCE, false, -1));
    array.push(this.getOrderByGroup(StaticOrderByKeys.RANDOM, false, -1));

    return array;
  }

  _labelingTaskLabelFormArray(task): FormArray {
    let array = this.formBuilder.array([]);
    let noLabelItemExists = false;
    for (let l of task.labels) {
      noLabelItemExists = (noLabelItemExists || l.id === 'NO_LABEL') ? true : false,
        array.push(
          this.formBuilder.group({
            id: l.id,
            name: l.name,
            active: l.active === undefined ? false : l.active,
            negate: l.negate === undefined ? false : l.negate,
          })
        );
    }
    if (task.labels.length > 0 && !noLabelItemExists) {
      array.push(
        this.formBuilder.group({
          id: 'NO_LABEL',
          name: 'Has no label', //filter not in labelid to ensure only the ones from task are used -- join part
          active: false,
        })
      );
    }

    return array;
  }
  _labelingTaskInformationSourceFormArray(task) {
    let array = this.formBuilder.array([]);
    for (let l of task.informationSources) {
      if (l.type == InformationSourceType.LABELING_FUNCTION || l.type == InformationSourceType.ACTIVE_LEARNING
        || l.type == InformationSourceType.ZERO_SHOT || l.type === undefined) {
        array.push(
          this.formBuilder.group({
            id: l.id,
            name: l.name,
            active: false,
            negate: false,
          })
        );
      }
    }
    return array;
  }

  getConfidenceFilterGroup() {
    const group = this.formBuilder.group({
      active: false,
      negate: false,
      lower: 0,
      upper: 100
    });
    this.groupValueChangesSubscribtion$.push(group.valueChanges
      .pipe(pairwise(), distinctUntilChanged())
      .subscribe(([prev, next]: [any, any]) => {
        if (!(prev.active && !next.active)) {
          group.get("active").setValue(true, { emitEvent: false });
        }
      }));
    //for pairwise
    group.get("active").setValue(false);
    return group;

  }

  private _getOrderByDisplayName(orderByKey: string) {
    switch (orderByKey) {
      case StaticOrderByKeys.RANDOM: return "Random";
      case StaticOrderByKeys.CONFIDENCE: return "Weak Supervision Confidence";
      default: return orderByKey; //attributes
    }
  }

  getOrderByGroup(orderByKey: string, isAttribute: boolean, direction) {
    if (!this.allOrderByGroups.has(orderByKey)) {
      let group;
      if (orderByKey == StaticOrderByKeys.RANDOM) {
        group = this.formBuilder.group({
          id: orderByKey,
          orderByKey: orderByKey,
          active: false,
          seedString: "",
          displayName: this._getOrderByDisplayName(orderByKey),
          isAttribute: isAttribute,
        });
        this.groupValueChangesSubscribtion$.push(group.valueChanges.subscribe(() => {
          const values = group.getRawValue();
          if (values.active && !values.seedString) {
            this.generateRandomSeed(group, false);
          }
        }));

      } else {
        group = this.formBuilder.group({
          id: orderByKey,
          orderByKey: orderByKey,
          active: false,
          direction: direction,
          displayName: this._getOrderByDisplayName(orderByKey),
          isAttribute: isAttribute,
        });
      }
      this.allOrderByGroups.set(orderByKey, group);
    }
    return this.allOrderByGroups.get(orderByKey);
  }

  generateRandomSeed(sortItem: FormGroup, emitEvent: boolean = true) {
    if (!sortItem.contains("seedString")) return;
    const length = 7;
    let seed = '';
    const charactersLength = DataBrowserComponent.seedCharacters.length;
    for (var i = 0; i < length; i++) {
      seed += DataBrowserComponent.seedCharacters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    sortItem.get("seedString").setValue(seed, { emitEvent: emitEvent });
  }

  ensureValidConfidence(group: FormGroup) {
    let lower = group.get("lower").value;
    let upper = group.get("upper").value;
    if (lower < 0) lower = 0;
    if (upper > 100) upper = 100;
    if (upper <= 1) upper = 1;
    if (lower >= upper) lower = upper - 1;
    if (upper <= lower) upper = lower + 1;
    group.get("lower").setValue(lower);
    group.get("upper").setValue(upper);
  }

  _labelingTaskCreateSearchGroup(item: SearchGroupItem, task): FormGroup {
    let group = this.formBuilder.group({
      id: ++this.globalSearchGroupCount,
      group: item.group,
      groupKey: item.groupKey,
      type: item.type,
      taskTarget:
        task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE
          ? task.attribute.name
          : 'Full Record',
      taskId: task.id,
      active: true,
      manualLabels: this._labelingTaskLabelFormArray(task),
      weakSupervisionLabels: this._labelingTaskLabelFormArray(task),
      sortByConfidence: this.getOrderByGroup(StaticOrderByKeys.CONFIDENCE, false, -1), //1, //-1 desc, 1 asc
      confidence: this.getConfidenceFilterGroup(),
      informationSources: this._labelingTaskInformationSourceFormArray(task),
      isWithDifferentResults: this.isWithDifferentResultsGroup(task)
    });
    if (task.labels.length == 0) group.disable();
    else {
      this.groupValueChangesSubscribtion$.push(group.valueChanges
        .pipe(pairwise(), distinctUntilChanged(), startWith(''))
        .subscribe(([prev, next]: [any, any]) =>
          this._labelingTaskGroupItemChanged(group, prev, next)
        ));
    }
    //change once so pairwise works as intended
    group.get('active').setValue(false);
    return group;
  }

  private isWithDifferentResultsGroup(task): FormGroup {
    return this.formBuilder.group({
      active: false,
      taskId: task.id,
      taskType: task.taskType
    });
  }

  private _labelingTaskGroupItemChanged(
    group: FormGroup,
    previousValues,
    next
  ) {
    if (!previousValues) return;
    let values = group.getRawValue(); //to ensure disabled will be returned as well
    const somethingActive = this._labelingTaskSomethingActive(values);
    const onlySearchChanged = this._labelingTaskOnlySearchChanged(values, previousValues);
    if (!values.active && !previousValues.active && somethingActive && !onlySearchChanged) {
      group.get('active').setValue(true);
      return;
    } else if (values.active && !somethingActive) {
      group.get('active').setValue(false);
      return;
    }
    this.refreshSearchParams(values);
    this.checkAndDisplayDisplayValuesChangedWarning();
    if (this.activeSlice?.static) {
      this.checkFilterChangedForStaticSlice();
    }
  }

  _labelingTaskOnlySearchChanged(values, previousValues): boolean {
    for (var i = 0; i < values.manualLabels.length; i++) {
      if (values.manualLabels[i].active != previousValues.manualLabels[i].active ||
        values.manualLabels[i].negate != previousValues.manualLabels[i].negate) return false;
    }
    for (var i = 0; i < values.weakSupervisionLabels.length; i++) {
      if (values.weakSupervisionLabels[i].active != previousValues.weakSupervisionLabels[i].active ||
        values.weakSupervisionLabels[i].negate != previousValues.weakSupervisionLabels[i].negate) return false;
    }
    for (var i = 0; i < values.informationSources.length; i++) {
      if (values.informationSources[i].active != previousValues.informationSources[i].active ||
        values.informationSources[i].negate != previousValues.informationSources[i].negate) return false;
    }
    if (values.confidence.active != previousValues.confidence.active ||
      values.confidence.negate != previousValues.confidence.negate) return false
    if (values.isWithDifferentResults.active != previousValues.isWithDifferentResults.active) return false

    return true;
  }

  _labelingTaskSomethingActive(values): boolean {
    for (let c of values.manualLabels) {
      if (c.active) return true;
    }
    for (let c of values.weakSupervisionLabels) {
      if (c.active) return true;
    }
    for (let c of values.informationSources) {
      if (c.active) return true;
    }
    if (values.confidence.active) return true;
    if (values.isWithDifferentResults.active) return true;
    return false;
  }

  _labelingTaskBuildSearchParamText(values): string {
    let text = '';

    let tmp = this._labelingTaskBuildSearchParamTextPart(
      values.manualLabels,
      'ML-label'
    );
    if (tmp) text += '(' + tmp + ')';

    tmp = this._labelingTaskBuildSearchParamTextPart(
      values.weakSupervisionLabels,
      'WS-label'
    );
    if (tmp) text += (text ? '\nAND ' : '') + ' (' + tmp + ')';

    tmp = this._labelingTaskBuildSearchParamTextPart(
      values.informationSources,
      'IS'
    );
    if (tmp) text += (text ? '\nAND ' : '') + ' (' + tmp + ')';

    if (values.isWithDifferentResults.active) {
      text += (text ? '\nAND ' : '') + ' (mixed IS results)';
    }

    if (values.confidence.active) {
      text += (text ? '\nAND ' : '') + 'WS-Confidence '
      if (values.confidence.negate) text += "NOT "
      text += "BETWEEN " + values.confidence.lower + "% AND " + values.confidence.upper + "%";
    }
    if (values.negate) text = '\nNOT (' + text + ')';
    else text = '\n' + text;
    return this.searchGroups.get(values.groupKey).nameAdd + ':' + text;
  }

  _labelingTaskBuildSearchParamTextPart(arr: any[], blockname: string): string {
    const drillDown: boolean = this.fullSearch.get("DRILL_DOWN").get("DRILL_DOWN").value;
    let text = '';
    let in_values = '';
    let not_in_values = '';
    const connector = drillDown ? ' AND ' : ', '
    const operatorPositive = drillDown ? ' HAS ' : ' IN '
    const operatorNegative = drillDown ? ' DOESN\'T HAVE ' : ' NOT IN '
    for (let c of arr) {
      if (c.active) {
        if (c.negate) not_in_values += (not_in_values ? connector : '') + c.name;
        else in_values += (in_values ? connector : '') + c.name;
      }
    }
    if (in_values || not_in_values) {
      text = blockname;
      if (in_values)
        text += operatorPositive + '(' + in_values + ')' + (not_in_values ? ' AND ' : '');
      if (not_in_values) text += operatorNegative + '(' + not_in_values + ')';
    }

    return text;
  }

  _attributeCreateSearchGroup(item: SearchGroupItem): FormGroup {
    let group = this.formBuilder.group({
      id: ++this.globalSearchGroupCount,
      group: item.group,
      groupKey: item.groupKey,
      type: item.type,
      name: item.defaultValue,
      active: false,
      negate: false,
      addText: item.addText,
      operator: item.operator,
      searchValue: 'x',
    });

    this.groupValueChangesSubscribtion$.push(group.valueChanges
      .pipe(pairwise(), distinctUntilChanged(), startWith(''))
      .subscribe(([prev, next]: [any, any]) => this._attributeSearchGroupItemChanged(group, prev, next)));

    //change once so pairwise works as intended
    group.get('searchValue').setValue('');
    return group;
  }

  private _attributeSearchGroupItemChanged(
    group: FormGroup,
    previousValues,
    next
  ) {
    if (!previousValues) return;
    let values = group.getRawValue(); //to ensure disabled will be returned as well
    if (!this.onlyActiveChanged(previousValues, values) && !values.active && !previousValues.active) {
      group.get('active').setValue(true, { emitEvent: false });
      values.active = true;
    }
    this.refreshSearchParams(values);
    this.checkAndDisplayDisplayValuesChangedWarning();
    if (this.activeSlice?.static) {
      this.refreshHighlightModule();
      this.checkFilterChangedForStaticSlice();
    }
  }

  private onlyActiveChanged(previousValues, currentValues): Boolean {
    for (const key in previousValues) {
      if (key == "active") continue;
      if (previousValues[key] != currentValues[key]) return false;
    }
    return true;
  }

  refreshSearchParamText() {
    for (let p of this.activeSearchParams) {
      this.updateSearchParamText(p);
      this.createSplittedText(p);
    }
  }
  createSplittedText(p) {
    const groupName = this.searchGroups.get(p.values.groupKey).nameAdd + ':';
    p.searchTextReplaced = p.searchText.replaceAll("\nAND", "\n<gn>" + groupName + "\n");
    p.splittedText = p.searchTextReplaced.split("\n<gn>");
  }

  updateSearchParam(searchElement, newValues) {
    searchElement.values = newValues;
    this.updateSearchParamText(searchElement);
    this.createSplittedText(searchElement);
  }

  updateSearchParamText(searchElement) {
    if (searchElement.values.type == SearchItemType.ATTRIBUTE) {
      searchElement.searchText =
        searchElement.values.name +
        ' ' +
        searchElement.values.operator +
        " '" +
        searchElement.values.searchValue +
        "'";
      if (searchElement.values.negate)
        searchElement.searchText = 'NOT (' + searchElement.searchText + ')';
    } else if (searchElement.values.type == SearchItemType.LABELING_TASK) {
      searchElement.searchText = this._labelingTaskBuildSearchParamText(
        searchElement.values
      );
    } else if (searchElement.values.type == SearchItemType.USER) {
      searchElement.searchText = this.userFilter.buildSearchParamText(
        searchElement.values
      );
    } else if (searchElement.values.type == SearchItemType.ORDER_BY) {
      searchElement.searchText = this._orderByBuildSearchParamText(
        searchElement.values
      );

      this.staticSliceOrderActive = searchElement.searchText.replace("ORDER BY ", "");
    }
  }
  refreshSearchParams(values) {
    for (let p of this.activeSearchParams) {
      if (p.id == values.id) {
        if (values.active) {
          p.values = values;
          this.updateSearchParam(p, values);
          return;
        } else {
          this.activeSearchParams = this.activeSearchParams.filter(
            (e) => e.id != values.id
          );
          return;
        }
      }
    }
    //doesn't exist yet
    if (values.active) {
      let p = { id: values.id };
      this.updateSearchParam(p, values);
      this.activeSearchParams.push(p);
    }
  }

  setFilterInactive(activeSearchParam) {
    for (let group of this.getSearchFormArray(activeSearchParam.values.groupKey)
      .controls) {
      if (!(group instanceof FormGroup)) continue;
      if (group.get('id').value == activeSearchParam.id) {
        group.patchValue({ active: false });
      }
    }
  }

  searchValuesChanged(): boolean {
    if (!this.lastSearchParams) return true;
    if (JSON.stringify(this.activeSearchParams) != this.lastSearchParams) return true;

    const recordCategory = this.fullSearch.get("RECORD_CATEGORY").get("CATEGORY").value;
    if (this.requestedRecordCategory != recordCategory) return true;
    const drillDown = this.fullSearch.get("DRILL_DOWN").get("DRILL_DOWN").value;
    if (this.requestedDrillDown != drillDown) return true;
    return false;
  }

  requestSimilarSearch(recordId: string, embeddingId: string = null) {
    this.similarSearchHelper.requestSimilarSearch(embeddingId, recordId);
  }

  requestOutlierSlice(embedding_id: string = null) {
    this.similarSearchHelper.requestOutlierSlice(embedding_id);
  }

  requestExtendedSearch(force: boolean = false) {
    if (!force) {
      if (this.activeSlice && this.activeSlice.static) return;
      if (!this.searchValuesChanged()) return;
    }
    this.similarSearchHelper.setRecordsHelper(false);

    this.currentSearchRequest = {
      callerName: "requestExtendedSearch",
      variables: {
        projectId: this.projectId,
        filterData: this.filterParser.parseFilterToExtended(),
        offset: 0,
        limit: 20,
      },

      func: this.recordApolloService.getRecordSearchAdvanced
    }

    this.requestCurrentBatch(false);
    this.refreshHighlightModule();
  }

  requestCurrentBatch(extend: boolean, offset: number = null, finishAction: () => void = null, finishActionThisObj: any = null) {
    if (!extend) this.loading = true;
    if (offset != null) {
      this.currentSearchRequest.variables.offset = offset;
    }
    this.currentSearchRequest.func.call(this.recordApolloService, this.currentSearchRequest.variables)
      .pipe(first()).subscribe((r) => {
        this.setExtendedData(r, extend);
        if (finishAction && finishActionThisObj) {
          finishAction.call(finishActionThisObj)
        }
      });

  }

  requestExtendedSearchByStaticSlice() {
    this.loading = true;
    this.currentSearchRequest = {
      callerName: "requestExtendedSearchByStaticSlice",
      variables: {
        projectId: this.projectId,
        sliceId: this.activeSlice.id,
        orderBy: this.filterParser.getOrderByJSON(),
        offset: 0,
        limit: 20,
      },

      func: this.recordApolloService.getRecordsByStaticSlice
    }
    this.requestCurrentBatch(false);

    this.refreshStaticSliceCount(this.activeSlice.id);
    this.refreshHighlightModule();
  }

  refreshStaticSliceCount(requestId) {
    this.recordApolloService.getStaticDataSliceCurrentCount(this.projectId, requestId).pipe(first()).subscribe((count) => {
      if (requestId == this.activeSlice.id) this.staticDataSliceCurrentCount = count;
      else this.staticDataSliceCurrentCount = null;
    });
  }


  refreshHighlightModule() {
    for (let e of this.attributesSortOrder) {
      this.refreshTextHighlightNeeded(e.key);
      this.refreshHighlightArray(e.key);
    }
  }

  storePreliminaryRecordIds(pos: number) {
    const sessionData = {
      recordIds: this.extendedRecords.recordList.map((record) => record.id),
      sessionId: this.extendedRecords.sessionId,
      partial: true,
      currentPos: pos,
      projectId: this.projectId
    }
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
  }

  setExtendedData(queryResults, extend: boolean) {
    if (!extend) {
      this.extendedRecords = {};
      this.loading = false;
    }
    this.extendedRecords.sql = queryResults.sql;
    this.extendedRecords.queryLimit = queryResults.queryLimit;
    this.extendedRecords.queryOffset = queryResults.queryOffset;
    this.extendedRecords.fullCount = queryResults.fullCount;
    this.extendedRecords.sessionId = queryResults.sessionId;
    let parsedRecordData = queryResults.recordList.map((record) => JSON.parse(record.recordData));
    this.parseRecordData(parsedRecordData);
    if (extend) {
      this.extendedRecords.recordList = [
        ...this.extendedRecords.recordList,
        ...parsedRecordData,
      ];
    } else {
      this.extendedRecords.recordList = parsedRecordData;
    }
  }

  parseRecordData(newRecordData) {
    for (let element of newRecordData) {
      if (element.rla_data) {
        element.rla_aggregation = {};
        for (const rlaLine of element.rla_data) {
          const rlaAggParts = this.getRlaAggregationKeyParts(rlaLine);
          if (!element.rla_aggregation.hasOwnProperty(rlaAggParts.key)) {
            element.rla_aggregation[rlaAggParts.key] = {
              type: rlaAggParts.type,
              task: rlaAggParts.taskName,
              label: rlaAggParts.labelName,
              color: rlaAggParts.labelColor,
              amount: 0,
              confidence: [],
              confidenceAvg: "",
              //manual, weak supervision & specific information sources are "related"
              isWSRelated: !(rlaLine.source_type == LabelSource.INFORMATION_SOURCE && !rlaLine.weak_supervision_id)
            };
          }
          element.rla_aggregation[rlaAggParts.key].amount++;
          if (rlaLine.confidence != null && rlaLine.source_type == LabelSource.WEAK_SUPERVISION) {
            element.rla_aggregation[rlaAggParts.key].confidence.push(rlaLine.confidence);
          }
        }
        for (const key in element.rla_aggregation) {
          if (element.rla_aggregation[key].confidence.length == 0) continue;
          let sum = 0;
          for (const confidence of element.rla_aggregation[key].confidence) sum += confidence;
          element.rla_aggregation[key].confidenceAvg = Math.round((sum / element.rla_aggregation[key].confidence.length) * 10000) / 100 + "%";

        }
      }
    }
  }

  getRlaAggregationKeyParts(rlaLine) {
    let parts = this.getTaskAndLabelNameFromLabelId(rlaLine.labeling_task_label_id);
    if (rlaLine.source_type == LabelSource.INFORMATION_SOURCE) {
      parts.type = this.getInformationSourceTextById(rlaLine.source_id);
    }
    else if (rlaLine.source_type == LabelSource.MANUAL && rlaLine.is_gold_star) {
      parts.type = labelSourceToString(rlaLine.source_type) + " gold ⭐";
    }
    else {
      parts.type = labelSourceToString(rlaLine.source_type);
    }

    parts.key = parts.type + "_" + parts.taskName + "_" + parts.labelName;
    return parts;
  }
  getInformationSourceTextById(sourceId: string) {
    for (const [key, value] of this.tasks) {
      for (const source of value.informationSources) {
        if (sourceId == source.id) return informationSourceTypeToString(source.type, true) + ": " + source.name;
      }
    }
    return "UNKNOWN";
  }

  getTaskAndLabelNameFromLabelId(labelId: string): any {
    for (const [key, value] of this.tasks) {
      for (const label of value.labels) {
        if (label.id == labelId) return { taskName: value.name, labelName: label.name, labelColor: label.color };
      }
    }
    return { taskName: "UNKNOWN", labelName: "UNKNOWN", labelColor: "UNKNOWN" };
  }

  fetchMoreExtended() {
    if (!this.extendedRecords || this.similarSearchHelper.recordsInDisplay || !this.currentSearchRequest) return;
    this.requestCurrentBatch(true, this.extendedRecords.recordList.length)
  }

  toBeImplemented() {
    window.alert('Unfortunalty this is just a dummy :(');
  }
  openSearchMenu(target: HTMLElement) {
    this.isSearchMenuOpen = !this.isSearchMenuOpen;
    if (this.isSearchMenuOpen) {
      target.classList.add('rotate_transform');
      timer(1).subscribe(() => (this.isSearchMenuVisible = true)); //ensure smooth slide open
      if (this.timerSubscribtion) {
        this.timerSubscribtion.unsubscribe();
        this.timerSubscribtion = null;
      }
    } else {
      target.classList.remove('rotate_transform');
      this.timerSubscribtion = timer(500).subscribe(
        () => (this.isSearchMenuVisible = false)
      );
    }
  }
  toggleGroupMenu(groupKey: string, target: HTMLElement, forceValue: boolean = null) {
    let group = this.searchGroups.get(groupKey);
    if (forceValue != null) group.isOpen = forceValue
    else group.isOpen = !group.isOpen;

    if (group.isOpen) target.classList.add('rotate_transform');
    else target.classList.remove('rotate_transform');
    group.inOpenTransition = true;
    timer(250).subscribe(() => (group.inOpenTransition = false));
  }
  getChildrenHeight(searchGroupItems: HTMLElement) {
    return searchGroupItems.scrollHeight + 'px';
  }

  getOperatorDropdownValues() {
    if (this.searchOperatorDropdownArray.length == 0) {
      for (let t of Object.values(SearchOperator)) {
        this.searchOperatorDropdownArray.push({
          dataTip: getSearchOperatorTooltip(t),
          value: t,
        });
      }
    }
    return this.searchOperatorDropdownArray;
  }

  refreshTextHighlightNeeded(attributeKey) {
    for (let searchElement of this.activeSearchParams) {
      if (searchElement.values.group == SearchGroup.ATTRIBUTES) {
        if (searchElement.values.name == 'Any Attribute') {
          this.isTextHighlightNeeded.set(attributeKey, true);
          return;
        }
        if (
          searchElement.values.name == this.attributes.get(attributeKey).name
        ) {
          this.isTextHighlightNeeded.set(attributeKey, true);
          return;
        }
      }
    }
    this.isTextHighlightNeeded.set(attributeKey, false);
  }

  refreshHighlightArray(attributeKey) {
    let toSet = [];
    let filter;
    for (let searchElement of this.activeSearchParams) {
      if (searchElement.values.group == SearchGroup.ATTRIBUTES) {
        if (
          searchElement.values.name == 'Any Attribute' ||
          searchElement.values.name == this.attributes.get(attributeKey).name
        ) {
          filter = this.getRegexFromFilter(searchElement);
          if (filter != '') toSet.push(filter);
        }
      }
    }
    this.textHighlightArray.set(attributeKey, toSet);
  }
  private getRegexFromFilter(searchElement): string {
    let searchValue = searchElement.values.searchValue;
    searchValue = searchValue.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    if (searchElement.values.negate) return ''; //would hightlight everything
    switch (searchElement.values.operator) {
      case SearchOperator.EQUAL:
        return '^' + searchValue + '$';
      case SearchOperator.BEGINS_WITH:
        return '^' + searchValue;
      case SearchOperator.ENDS_WITH:
        return searchValue + '$';
      case SearchOperator.CONTAINS:
        return searchValue;
    }
    return '';
  }

  copyToClipboard(textToCopy: string) {
    navigator.clipboard.writeText(textToCopy);
  }

  toggleHighlightText() {
    this.highlightText = !this.highlightText;
  }

  toggleWeakSupervisionRelated() {
    this.weakSupervisionRelated = !this.weakSupervisionRelated;
  }

  setSortForControl(control: AbstractControl) {
    if (control.get('active').value && control.get('direction').value == -1)
      control.get('direction').setValue(1);
    else if (
      control.get('active').value &&
      control.get('direction').value == 1
    ) {
      control.get('direction').setValue(-1);
      control.get('active').setValue(false);
    } else control.get('active').setValue(true);
  }
  setActiveNegateGroup(group: FormGroup) {
    if (group.disabled) return;
    if (group.contains('negate')) {
      if (!group.get('active').value)
        group.get('active').setValue(true);
      else if (group.get('active').value && !group.get('negate').value)
        group.get('negate').setValue(true);
      else {
        group.get('negate').setValue(false);
        group.get('active').setValue(false);
      }
    } else {
      group.get('active').setValue(!group.get('active').value);
    }
  }
  getActiveNegateGroupColor(group: FormGroup) {
    if (!group.get('active').value) return null;
    if (group.contains('negate'))
      return group.get('negate').value ? '#ef4444' : '#2563eb';
    return '#2563eb';
  }

  focusModalInputBox(event: Event, inputBoxName: string) {
    if (event.target instanceof HTMLInputElement) {
      const modalDiv = event.target.nextSibling;
      if (modalDiv instanceof HTMLElement) {
        const inputChildren = modalDiv.getElementsByTagName('INPUT');
        for (var i = 0; i < inputChildren.length; ++i) {
          var node = inputChildren[i];
          if (
            node instanceof HTMLInputElement &&
            node.getAttribute('name') == inputBoxName
          ) {
            node.focus();
            node.value = "";
            return;
          }
        }
      }
    }
  }

  createSlice(name: string) {
    if (!name) return;

    this.projectApolloService.createDataSlice(this.projectId,
      name,
      this.isStaticDataSlice,
      this.getRawFilterForSave(),
      this.filterParser.parseFilterToExtended())
      .pipe(first()).subscribe(data => {
        const id = data["data"]["createDataSlice"]["id"];
        if (id != "") this.lastActiveSliceId = id;
      });

    this.displayOutdatedWarning = false;
  }

  getRawFilterForSave(): string {
    const selectedFilters = {};
    for (let [key, value] of this.fullSearch) {
      selectedFilters[key] = value.getRawValue();
    }
    return JSON.stringify(selectedFilters, this.staticGroupInformationFilter);
  }


  updateSliceByName(name: string) {
    for (let value of this.slicesById.values()) {
      if (value.name == name) {
        this.activeSlice = value;
        this.updateSlice(this.isStaticDataSlice);
        break;
      }
    }
  }

  updateSlice(isStatic = null) {
    if (!this.activeSlice) {
      return;
    }

    isStatic = isStatic == null ? this.activeSlice.static : isStatic

    this.lastActiveSliceId = this.activeSlice.id;
    this.projectApolloService.updateDataSlice(this.projectId, this.activeSlice.id, isStatic,
      this.getRawFilterForSave(),
      this.filterParser.parseFilterToExtended()).pipe(first()).subscribe(() => {
        let timer = interval(250).subscribe(() => {
          if (!this.lastActiveSliceId) {
            //refresh after the dataslice was updated so the new values are ensured
            this.refreshDataSlice();
            timer.unsubscribe();
          }
        })
      });
    this.displayOutdatedWarning = false;

  }


  deleteSlice(id: string = "") {
    let idToDelete = "";
    if (id != "") {
      idToDelete = id;
      this.lastActiveSliceId = this.activeSlice ? this.activeSlice.id : this.lastActiveSliceId;
    }
    else if (this.activeSlice) {
      idToDelete = this.activeSlice.id;
      this.activeSlice = null;
      this.lastActiveSliceId = "";
      this.prepareFilters();

    }
    else return;
    if (this.filteredSliceIds.has(idToDelete)) this.filteredSliceIds.delete(idToDelete);
    this.projectApolloService.deleteDataSlice(this.projectId, idToDelete).pipe(first()).subscribe(() => this.clearFilters());
  }

  filterAvailableSlices() {
    if (this.dataSliceFilter == "" || this.sliceNames.size <= 6) {
      this.filteredSliceIds = new Set();
      return;
    }
    for (let value of this.slicesById.values()) {
      if (!value.name.toLowerCase().includes(this.dataSliceFilter.toLowerCase())) {
        this.filteredSliceIds.add(value.id);
      }
      else {
        this.filteredSliceIds.delete(value.id);
      }
    }
  }

  toggleSlice(slice) {
    this.loading = true;
    if (this.activeSlice == slice) {
      this.activeSlice = null;
      this.clearFilters()
      this.displayChangedValuesWarning = false;
      this.displayOutdatedWarning = false;
      if (slice.static) this.requestExtendedSearch(true);
      else this.loading = false;

    }
    else {
      this.refreshDataSlice(slice);
    }
  }

  refreshDataSlice(slice: any = null) {
    const tmpSlice = slice ? slice : this.activeSlice;
    this.clearFilters();
    this.initializingFilter = true;
    this.activeSlice = tmpSlice;
    this.activateFilter();
    if (this.activeSlice.static) {
      this.requestExtendedSearchByStaticSlice();
      this.staticDataSliceCurrentCount = this.activeSlice.count;
    } else {
      this.requestExtendedSearch(true);
    }
    this.initializingFilter = false;
    //ensure current filter is known not the one saved (e.g. if a label is missing)
    this.activeSlice.initFilterRaw = this.getRawFilterForSave();
    this.checkFilterChangedForStaticSlice();
  }

  checkFilterChangedForStaticSlice() {
    if (!this.activeSlice?.static) return;
    if (this.activeSlice.initFilterRaw) {
      this.displayOutdatedWarning = this.activeSlice.initFilterRaw != this.getRawFilterForSave();
    }

  }

  updateSliceInfo(sliceId: string) {
    if (!this.slicesById.has(sliceId)) {
      this.sliceInfo = [{ fieldName: "Error", fieldValue: "Slice does not exist!" }];
    }
    const slice = this.slicesById.get(sliceId);

    let sliceInfo = {};

    if (slice.sliceType == this.SliceTypes.STATIC_OUTLIER) {
      sliceInfo["Name"] = this.parseUTC(slice.createdAt);
    } else {
      sliceInfo["Name"] = slice.name;
      sliceInfo["Created at"] = this.parseUTC(slice.createdAt);
    }
    sliceInfo["Created by"] = "Unknown"

    this.organizationApolloService.getOrganizationUsers().pipe(first())
      .subscribe(users => {
        const findById = users.find(user => user.id == slice.createdBy);

        if (findById) { sliceInfo["Created by"] = findById.firstName + " " + findById.lastName };
      });

    sliceInfo["Type"] = getDescriptionForSliceType(slice.sliceType);

    const info = JSON.parse(slice.info);
    for (let key in info) {
      sliceInfo[key] = info[key];
    }
    this.sliceInfo = sliceInfo;
  }

  orderOriginal(a: KeyValue<number, string>, b: KeyValue<number, string>): number {
    return 0
  }

  parseUTC(utc: string, forOutlier: boolean = false) {
    const utcDate = dateAsUTCDate(new Date(utc));
    if (forOutlier) return utcDate.toLocaleString().replace(", ", "\n");
    else return utcDate.toLocaleString();
  }

  activateFilter(filterData: string = null) {
    if (!filterData) filterData = this.activeSlice.filterRaw;
    if (!filterData) return;
    const filters = JSON.parse(filterData);
    for (let key in filters) {
      if (key.startsWith(SearchGroup.LABELING_TASKS)) {
        this.processTaskFilters(key, filters);
      }
      else if (key === SearchGroup.ATTRIBUTES) {
        this.processAttributeFilters(key, filters);
      }
      else if (key === "RECORD_CATEGORY") {
        this.processCategoryFilters(key, filters);
      } else if (key === "DRILL_DOWN") {
        this.processDrillDown(key, filters);
      } else if (key == SearchGroup.ORDER_STATEMENTS) {
        this.processOrderByFilter(key, filters);
      } else if (key == SearchGroup.USER_FILTER) {
        this.userFilter.processUserFilters(key, filters);
      }
      else {
        this.displayOutdatedWarning = true;
      }
    }
  }
  processOrderByFilter(key, filterGroups: Object) {
    if (!this.fullSearch.has(key)) { this.displayOutdatedWarning = true; return; }
    const orderGroup: FormGroup = this.getSearchFormArray(key).controls[0] as FormGroup;
    const filterValues = filterGroups[key].groupElements[0];
    const setSomething = this.applyValuesToFormGroup(filterValues, orderGroup);
    let values = orderGroup.getRawValue();
    values.active = this.anyOrderActive(values);
    this.refreshSearchParams(values);
    if (setSomething) {
      orderGroup.get("updateDummy").setValue(true);
      this.toggleGroupMenu(key, this.getSearchGroupsHTMLByName(key), true);
    }
  }

  processTaskFilters(key: string, filterGroups: Object): void {
    const taskId = filterGroups[key]["groupElements"][0]["taskId"];
    const taskGroup: FormGroup = this.getLabelingTaskFormGroupById(taskId) as FormGroup;
    if (!taskGroup) { this.displayOutdatedWarning = true; return; }
    let setSomething = false;
    setSomething = this.applyValuesToFormGroup(filterGroups[key]["groupElements"][0], taskGroup);
    const rawValues = taskGroup.getRawValue();
    this.refreshSearchParams(rawValues);
    const activeElement = taskGroup.get("active");
    activeElement.setValue(true);
    if (!rawValues.active) activeElement.setValue(false);

    if (setSomething) {
      this.toggleGroupMenu(key, this.getSearchGroupsHTMLByName(key), true);
    }
  }

  processAttributeFilters(key: string, filterGroups: Object): void {
    if (!this.fullSearch.has(key)) { this.displayOutdatedWarning = true; return; }
    const groupElements = filterGroups[key].groupElements;
    const formArray = this.getSearchFormArray(key);
    let currentGroupItem: FormGroup = formArray.controls[0] as FormGroup;
    let setSomething = false;
    for (let i = 0; i < groupElements.length; i++) {
      if (i > 0) {
        currentGroupItem = this.addSearchGroupItem(currentGroupItem);
      }
      setSomething = this.applyValuesToFormGroup(groupElements[i], currentGroupItem) || setSomething;
      const rawValues = currentGroupItem.getRawValue();
      this.refreshSearchParams(rawValues);

      //for pairwise
      const activeElement = currentGroupItem.get("active");
      activeElement.setValue(true);
      if (!rawValues.active) {
        activeElement.setValue(false);
      }
    }
    if (setSomething) {
      this.toggleGroupMenu(key, this.getSearchGroupsHTMLByName(key), true);
    }
  }

  processCategoryFilters(key: string, filterGroups: Object): void {
    if (!this.fullSearch.has(key)) { this.displayOutdatedWarning = true; return; }
    const categoryGroup: FormGroup = this.fullSearch.get(key) as FormGroup;
    this.applyValuesToFormGroup(filterGroups[key], categoryGroup);
    this.refreshSearchParams(categoryGroup.getRawValue());
  }

  processDrillDown(key: string, filterGroups: Object): void {
    if (!this.fullSearch.has(key)) { this.displayOutdatedWarning = true; return; }
    const drillDown: FormGroup = this.fullSearch.get(key) as FormGroup;
    this.applyValuesToFormGroup(filterGroups[key], drillDown);
    this.refreshSearchParams(drillDown.getRawValue());
  }

  applyValuesToFormGroup(values: any, group: FormGroup): boolean {
    let setSomething = false;
    for (let key in values) {
      if (!group.get(key)) {
        this.displayOutdatedWarning = true;
        continue;
      }
      if (key == "id" || key == "taskId") {
        continue;
      }

      if (Array.isArray(values[key])) {
        for (let nestedValue of values[key]) {
          let nestedGroup = this.getFormGroupById(group.get(key) as FormGroup, nestedValue.id);
          if (!nestedGroup) {
            this.displayOutdatedWarning = true;
            continue;
          }
          setSomething = this.applyValuesToFormGroup(nestedValue, nestedGroup) || setSomething;
        }
      }
      else if (typeof values[key] == 'object') {
        setSomething = this.applyValuesToFormGroup(values[key], group.get(key) as FormGroup) || setSomething;
      }
      else if (this.checkGroupValueShouldBeSet(key, group, values)) {
        group.get(key).setValue(values[key], { emitEvent: false });
        setSomething = true;
      }

    }
    return setSomething;
  }

  private checkGroupValueShouldBeSet(key: string, group: FormGroup, values: any): boolean {
    if (key == "name" && group.value.groupKey != "ATTRIBUTES") return false;
    if (group.get(key).value == values[key]) return false;

    return true;
  }

  getLabelingTaskFormGroupById(id: string) {
    for (let [key, value] of this.fullSearch) {
      if (!key.startsWith(SearchGroup.LABELING_TASKS)) continue;
      let formArray = this.getSearchFormArray(key);
      if (formArray.controls[0].get("taskId").value == id) {
        return formArray.controls[0];
      }
    }
    return null;
  }

  getFormGroupById(searchGroup: FormGroup, id: string) {
    if (searchGroup instanceof FormArray) {
      for (const element of searchGroup.controls) {
        let result = this.getFormGroupById(element as FormGroup, id);
        if (result) { return result; }
      }
    }

    else if ((searchGroup.get("id")?.value == id) || (searchGroup.get("taskId")?.value == id)) {
      return searchGroup;
    }
    return null;
  }

  closeDrawer() {
    for (const el of this.searchGroupOrder) {
      const groupHTML = this.getSearchGroupsHTMLByName(el.key);
      if (groupHTML) this.toggleGroupMenu(el.key, groupHTML, false)
    }
  }

  getSearchGroupsHTMLByName(name: string): HTMLElement {
    for (const el of this.searchGroupsHTML) {
      if (el.nativeElement.name == name) return el.nativeElement;
    }
    return null;
  }

  clearLabelingTaskFormGroups() {
    for (let [key, value] of this.fullSearch) {
      if (key.startsWith(SearchGroup.LABELING_TASKS)) {
        this.clearLabelingTaskFormGroupsHelper(value);
        this.refreshSearchParams((value as FormGroup).getRawValue());
      }
    }
  }

  clearLabelingTaskFormGroupsHelper(searchGroup: FormGroup) {
    if (searchGroup instanceof FormArray) {
      for (const element of searchGroup.controls) {
        this.clearLabelingTaskFormGroupsHelper(element as FormGroup);
      }
    }

    const values = searchGroup.value;
    for (let key in values) {
      if (Array.isArray(values[key])) {
        const arr = searchGroup.get(key) as FormArray;
        for (const group of arr.controls) { // maybe use group here
          this.clearLabelingTaskFormGroupsHelper(group as FormGroup);
        }
      }
      else if (typeof values[key] == 'object') {
        this.clearLabelingTaskFormGroupsHelper(searchGroup.get(key) as FormGroup);
      }
      else if (key in this.labelingTaskDefaultValues) {
        searchGroup.get(key).setValue(this.labelingTaskDefaultValues[key], { emitEvent: false })
      }
    }
  }

  prepareFilters() {
    this.activeSlice = null;
    this.dataSliceFilter = "";
    this.filterAvailableSlices();
    this.displayOutdatedWarning = false;
    this.displayChangedValuesWarning = false;
    this.clearLabelingTaskFormGroups();
    this.clearAttributeFormGroups();
    this.clearUserFormGroups();
    this.clearOrderByFormGroups();
    this.activeSearchParams = [];
    this.fullSearch.get("RECORD_CATEGORY").get("CATEGORY").setValue("SCALE");
    this.fullSearch.get("DRILL_DOWN").get("DRILL_DOWN").setValue(false);
  }

  clearOrderByFormGroups() {
    const orderGroup = this.getSearchFormArray(SearchGroup.ORDER_STATEMENTS).controls[0] as FormGroup;
    const orderArray = orderGroup.get("orderBy") as FormArray;
    //clear seed:
    for (const element of orderArray.controls) {
      if (element instanceof FormGroup && element.contains("seedString")) {
        element.get("seedString").setValue("", { emitEvent: false });
      }
    }
    //clear rest
    const dummy = orderGroup.get("updateDummy");
    dummy.setValue(true);
    dummy.setValue(false);

  }

  clearAttributeFormGroups() {
    const formArray = this.getSearchFormArray(SearchGroup.ATTRIBUTES);
    for (let i = formArray.controls.length - 1; i > 0; i--) {
      this.removeSearchGroupItem(SearchGroup.ATTRIBUTES, formArray.controls[i].get("id").value, false);
    }

    let lastAttributeElement = formArray.controls[0];
    for (let key in this.attributeDefaultValues) {
      if (key in lastAttributeElement.value) {
        lastAttributeElement.get(key).setValue(this.attributeDefaultValues[key], { emitEvent: false });
      }
    }
  }

  clearUserFormGroups() {
    const userGroup = this.getSearchFormArray(SearchGroup.USER_FILTER).controls[0] as FormGroup;
    const userArray = userGroup.get("users") as FormArray;
    //clear seed:
    for (const element of userArray.controls) {

      element.get("active").setValue(false, { emitEvent: false });
      element.get("negate").setValue(false, { emitEvent: false });
    }
    //clear rest
    const dummy = userGroup.get("updateDummy");
    dummy.setValue(true);
    dummy.setValue(false);
  }


  clearFilters() {
    let rerequestNeeded = this.similarSearchHelper.recordsInDisplay && !this.similarSearchHelper.recordsRequested;
    this.similarSearchHelper.setRecordsHelper(false);
    this.prepareFilters();
    if (this.activeSlice?.static) this.requestExtendedSearch(true);
    this.activeSlice = null;
    this.closeDrawer();
    //ensure change methods work as expected
    let anythingActive = false;
    for (let [key, value] of this.fullSearch) {
      const arr = this.getSearchFormArray(key);
      const active = arr?.controls[0].get("active");
      if (active) {
        anythingActive = anythingActive || active.value;
        active.setValue(false);
        active.setValue(false);
      }
    }
    if (rerequestNeeded && !anythingActive) this.requestExtendedSearch(true);
  }

  refreshAnyRecordManuallyLabeled(projectId: string) {
    this.recordApolloService.isAnyRecordManuallyLabeled(this.projectId).pipe(first()).subscribe((anyRecordManuallyLabeled) => {
      this.anyRecordManuallyLabeled = anyRecordManuallyLabeled;
    });
  }

  checkNameExists(value: string) {
    this.sliceNameExists = this.sliceNames.has(value);
  }

  checkAndDisplayDisplayValuesChangedWarning() {
    if (this.activeSlice?.static && !this.initializingFilter) this.displayChangedValuesWarning = true;
  }

  checkStaticAllowed() {
    this.isStaticDataSlice = false;
    if (!this.isStaticDataSlice) return


    let allowed = (this.extendedRecords != undefined && this.extendedRecords.fullCount && this.extendedRecords.fullCount < 10000);
    if (!allowed) {
      this.isStaticDataSlice = false;
      this.displayStaticNotAllowedWarning = true;
    }
  }
  setStatic(htmlDynamic: HTMLInputElement, htmlStatic: HTMLInputElement, isStatic: boolean) {
    htmlDynamic.checked = !isStatic;
    htmlStatic.checked = isStatic;
    this.isStaticDataSlice = isStatic;
  }

  private staticGroupInformationFilter(key, value) {
    switch (key) {
      case "group":
      case "groupKey":
      case "type":
      case "addText":
      case "taskTarget":
        return undefined;
      default:
        return value;
    }
  }

  attributeDefaultValues = {
    "name": "Any Attribute",
    "active": false,
    "negate": false,
    "operator": SearchOperator.CONTAINS,
    "searchValue": ""
  }

  labelingTaskDefaultValues = {
    "active": false,
    "negate": false,
    "lower": 0,
    "upper": 100,
    "direction": -1
  }

  handleWebsocketNotification(msgParts) {
    const currentFilterData = this.getRawFilterForSave();
    this.lastActiveSliceId = this.activeSlice ? this.activeSlice.id : "";
    if ('attributes_updated' == msgParts[1]) {
      this.refreshAndDo(this.attributesQuery$, this.attributeWait, () => this.websocketFilterRefresh(currentFilterData));
      this.alterUser(msgParts[1])
    }
    else if (['data_slice_created', 'data_slice_updated', 'data_slice_deleted'].includes(msgParts[1])) {
      this.dataSlicesQuery$.refetch();
    } else if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created', 'information_source_created', 'information_source_updated', 'information_source_deleted'].includes(msgParts[1])) {
      this.refreshAndDo(this.labelingTasksQuery$, this.labelingTaskWait, () => this.websocketFilterRefresh(currentFilterData));
      this.alterUser(msgParts[1])
    }
    this.similarSearchHelper.handleWebsocketNotification(msgParts);
  }

  alterUser(msgId) {
    if (this.alertLastVisible && Date.now() - this.alertLastVisible < 1000) return;
    alert("Settings were changed (msgId: " + msgId + ")\nFilter will be reloaded.");
    this.alertLastVisible = Date.now();
  }

  websocketFilterRefresh(currentFilterData: string) {
    this.clearFilters();
    this.groupValueChangesSubscribtion$.forEach(x => x.unsubscribe());
    this.groupValueChangesSubscribtion$ = [];
    this.prepareSearchGroups();
    this.activateFilter(currentFilterData);
    if (!this.activeSlice) this.displayOutdatedWarning = false;
  }

  //small own logic to prevent call before load is finished, wait is wrapped to use a call by reference
  refreshAndDo(query$, wait: { isWaiting: boolean }, func: () => void) {
    wait.isWaiting = true;
    query$.refetch();
    const intervallTimer = interval(250).subscribe(() => {
      if (!wait.isWaiting) {
        func.call(this);
        intervallTimer.unsubscribe();
      }
    })
  }

  requestFileExport(projectId: string): void {
    this.downloadMessage = DownloadState.PREPARATION;

    this.projectApolloService.exportRecords(projectId, this.extendedRecords.sessionId).subscribe((e) => {
      this.downloadMessage = DownloadState.DOWNLOAD;
      const downloadContent = JSON.parse(e);
      this.download('export.json', downloadContent);
      const timerTime = Math.max(2000, e.length * 0.0001);
      timer(timerTime).subscribe(
        () => (this.downloadMessage = DownloadState.NONE)
      );
    });
  }

  private download(filename, text) {
    var element = document.createElement('a');

    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    );
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
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

  getBorderStyle(slice) {
    if (slice.static) {
      return "border-solid"
    }
    else {
      return "border-dashed"
    }
  }
}
