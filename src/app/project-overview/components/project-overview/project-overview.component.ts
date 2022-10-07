import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { first, tap, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { Project } from 'src/app/base/entities/project';
import { LabelingTaskTarget } from 'src/app/base/enum/graphql-enums';
import { ConfigManager } from 'src/app/base/services/config-service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { Slice } from 'src/app/data/components/data-browser/helper-classes/search-parameters';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { schemeCategory24 } from 'src/app/util/colors';
import { UserManager } from 'src/app/util/user-manager';
import { DisplayGraphs, getDisplayGraphValueArray, getEmptyProjectStats, ProjectStats } from './project-overview.helper';

@Component({
  selector: 'kern-project-overview',
  templateUrl: './project-overview.component.html',
  styleUrls: ['./project-overview.component.scss'],
})
export class ProjectOverviewComponent implements OnInit, OnDestroy {
  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }
  get DisplayGraphsType(): typeof DisplayGraphs {
    return DisplayGraphs;
  }
  project$: any;
  project: Project;
  description: string = '';
  descriptionOpen: boolean = false;

  lineChartData: any;

  newLabel = new FormControl('');
  colors = schemeCategory24;
  downloadMessage: DownloadState = DownloadState.NONE;
  downloadProjectMessage: DownloadState = DownloadState.NONE;

  //Chart
  labelDistribution: any;
  confusionMatrix: any;
  interAnnotatorMatrix: any;

  graphsHaveValues: boolean = false;
  labelingTasksQuery$: any;
  labelingTasks$: any;
  labelingTasksTargetForm = new FormControl('');
  labelingTasksTargetMap = new Map<string, Map<string, any>>();
  labelingTasksForm = new FormControl('');
  dataSliceForm = new FormControl('@@NO_SLICE@@');
  goldUserRequested = false;
  labelingTasksMap: Map<string, any>;
  labels: any = [];
  displayConfusion: boolean = false;

  displayGraphsForm = new FormControl(0);
  displayGraphsValueArray;

  dataSlicesQuery$: any;
  dataSlicesById: Map<string, any> = new Map<string, any>();

  interAnnotatorFormGroup: FormGroup;
  projectStats: ProjectStats = getEmptyProjectStats();
  subscriptions$: Subscription[] = [];

  isManaged: boolean;

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private formBuilder: FormBuilder
  ) { }

  ngOnDestroy(): void {
    if (this.labelingTasks$) this.labelingTasks$.unsubscribe();
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId)
    this.saveSettingsToLocalStorage();
    CommentDataManager.unregisterAllCommentRequests(this);
  }


  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);

    this.routeService.updateActivatedRoute(this.activatedRoute);

    this.checkIfManagedVersion();


    const currentProjectID =
      this.activatedRoute.parent.snapshot.paramMap.get('projectId');

    this.prepareComponent(currentProjectID);

    this.project$ = this.projectApolloService
      .getProjectById(currentProjectID)
      .pipe(
        tap((project) => {
          this.project = project;
          this.description = project.description;
        })
      );

    this.prepareDataSlicesRequest(currentProjectID);
    this.prepareLabelingTask(currentProjectID);
    this.labelingTasksTargetForm.valueChanges.subscribe((target) => {
      this.labelingTasksMap = this.labelingTasksTargetMap.get(target);
      this.labelingTasksForm.setValue(
        this.labelingTasksMap.keys().next().value
      ); //set to first entry
    });

    this.labelingTasksForm.valueChanges.pipe(debounceTime(50)).subscribe((labelingTaskId) => {
      this.labels = this.labelingTasksMap.get(labelingTaskId).labels;
      this.setDisplayNERConfusion(currentProjectID, labelingTaskId);
      this.getLabelDistributions(currentProjectID, labelingTaskId);
      this.getConfidenceDistributions(currentProjectID, labelingTaskId);
      this.getConfusionMatrix(currentProjectID, labelingTaskId);
      this.getInterAnnotatorMatrix(currentProjectID, labelingTaskId);
      this.refreshProjectStats(currentProjectID);
      this.saveSettingsToLocalStorage();
    });

    this.dataSliceForm.valueChanges.pipe(debounceTime(50)).subscribe((sliceId) => {
      this.getLabelDistributions(currentProjectID, this.labelingTasksForm.value);
      this.getConfidenceDistributions(currentProjectID, this.labelingTasksForm.value);
      this.getConfusionMatrix(currentProjectID, this.labelingTasksForm.value);
      this.getInterAnnotatorMatrix(currentProjectID, this.labelingTasksForm.value);
      this.refreshProjectStats(currentProjectID);
      this.saveSettingsToLocalStorage();
    });
    this.displayGraphsForm.valueChanges.subscribe(() => this.saveSettingsToLocalStorage())
    this.setUpCommentRequests(currentProjectID);
  }

  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.DATA_SLICE, projectId: projectId });
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

  setDisplayNERConfusion(projectId: string, labelingTaskId: string) {
    if (this.labelingTasksMap.get(labelingTaskId).taskType != 'INFORMATION_EXTRACTION') {
      this.displayConfusion = true;
    } else {
      this.projectApolloService.isRatsTokenizationStillRunning(projectId).pipe(first()).subscribe((x) => this.displayConfusion = !x);
    }
  }

  refreshProjectStats(projectId: string) {
    this.projectStats.generalLoading = true;
    this.projectStats.interAnnotatorLoading = true;
    const dataSliceId = this.dataSliceForm.value == "@@NO_SLICE@@" ? null : this.dataSliceForm.value;

    this.projectApolloService.getGeneralProjectStats(projectId, this.labelingTasksForm.value, dataSliceId).pipe(first()).subscribe(stats => {
      this.projectStats.generalStats = stats;
      stats.forEach(element => {
        if (element.source_type == 'INFORMATION_SOURCE') {
          this.projectStats.general[element.source_type] = element.absolut_labeled + " hitting on current slice\n" + element.records_in_slice + " defined in labeling task";

          this.projectStats.generalPercent[element.source_type] = element.absolut_labeled + " (" + element.records_in_slice + ")";

        } else {
          this.projectStats.general[element.source_type] = element.absolut_labeled + " of " + element.records_in_slice;
          this.projectStats.generalStats[element.source_type] = element.percent;
        }
      });
      this.projectStats.generalLoading = false;
    })
  }

  calcInterAnnotatorAvg(interAnnotatorMatrix) {
    let c = 0;
    let s = 0;
    interAnnotatorMatrix.elements.forEach(e => {
      if (e.userIdA != e.userIdB && e.percent != -1) {
        c++;
        s += e.percent;
      }
    });
    if (c) {
      this.projectStats.interAnnotator = Number(c / 2) + " with intersections";
      this.projectStats.interAnnotatorStat = s / c;
    } else {
      this.projectStats.interAnnotator = "No intersections";
      this.projectStats.interAnnotatorStat = -1;
    }
    this.projectStats.interAnnotatorLoading = false;
  }

  saveSettingsToLocalStorage() {
    if (!this.project) return;
    let currentData = JSON.parse(localStorage.getItem("projectOverviewData"));
    if (!currentData) currentData = {};

    currentData[this.project.id] = this.parseOverviewSettingsToDict();

    localStorage.setItem('projectOverviewData', JSON.stringify(currentData));
  }

  parseOverviewSettingsToDict(): {} {
    let toReturn = {}
    const values = this.interAnnotatorFormGroup.getRawValue();

    toReturn["interAnnotatorAllUsers"] = values.allUsers;
    toReturn["interAnnotatorGoldUser"] = values.goldUser;
    toReturn["interAnnotatorDataSlice"] = values.dataSlice;
    toReturn["labelingTasksTarget"] = this.labelingTasksTargetForm.value;
    toReturn["labelingTasks"] = this.labelingTasksForm.value;
    toReturn["displayGraphs"] = this.displayGraphsForm.value;
    toReturn["dataSlice"] = this.dataSliceForm.value;

    return toReturn;
  }

  prepareDataSlicesRequest(projectID: string) {
    let vc$;
    [this.dataSlicesQuery$, vc$] = this.projectApolloService.getDataSlices(projectID);
    this.subscriptions$.push(vc$.subscribe((slices) => {
      this.dataSlicesById.clear();
      slices.forEach(element => {
        if (element.sliceType == Slice.STATIC_DEFAULT) this.dataSlicesById.set(element.id, element);
      });
      const dataSlice = this.interAnnotatorFormGroup.get("dataSlice").value;
      if (dataSlice != "@@NO_SLICE@@") {
        if (!this.dataSlicesById.has(dataSlice)) this.interAnnotatorFormGroup.get("dataSlice").setValue("@@NO_SLICE@@");
        this.getInterAnnotatorMatrix(projectID, this.labelingTasksForm.value);
      }
    }));

  }

  prepareComponent(projectId: string) {
    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: ['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created', 'weak_supervision_finished', 'data_slice_created', 'data_slice_updated', 'data_slice_deleted'],
      func: this.handleWebsocketNotification
    });
    this.displayGraphsValueArray = getDisplayGraphValueArray();

    this.interAnnotatorFormGroup = this.formBuilder.group({
      goldUser: true,
      allUsers: false,
      dataSlice: "@@NO_SLICE@@",
    });
    this.interAnnotatorFormGroup.valueChanges.pipe(distinctUntilChanged()).subscribe(() => this.interAnnotatorSelectionChanged());

    let tmp = localStorage.getItem("projectOverviewData");
    if (tmp) {
      let parsedValues = JSON.parse(tmp);
      if (!parsedValues[projectId]) return;
      else parsedValues = parsedValues[projectId]
      if (parsedValues["interAnnotatorAllUsers"] != undefined) this.interAnnotatorFormGroup.get("allUsers").setValue(parsedValues["interAnnotatorAllUsers"], { emitEvent: false });
      if (parsedValues["interAnnotatorGoldUser"] != undefined) this.interAnnotatorFormGroup.get("goldUser").setValue(parsedValues["interAnnotatorGoldUser"], { emitEvent: false });
      if (parsedValues["interAnnotatorDataSlice"]) this.interAnnotatorFormGroup.get("dataSlice").setValue(parsedValues["interAnnotatorDataSlice"], { emitEvent: false });

      if (parsedValues["labelingTasksTarget"]) this.labelingTasksTargetForm.setValue(parsedValues["labelingTasksTarget"], { emitEvent: false });
      if (parsedValues["labelingTasks"]) this.labelingTasksForm.setValue(parsedValues["labelingTasks"], { emitEvent: false });
      if (parsedValues["displayGraphs"]) this.displayGraphsForm.setValue(parsedValues["displayGraphs"], { emitEvent: false });
      if (parsedValues["dataSlice"]) this.dataSliceForm.setValue(parsedValues["dataSlice"], { emitEvent: false });
    }
  }

  prepareLabelingTask(projectID: string) {

    [this.labelingTasksQuery$, this.labelingTasks$] = this.projectApolloService.getLabelingTasksByProjectId(projectID);


    this.labelingTasks$ = this.labelingTasks$.subscribe((tasks) => {
      tasks.sort((a, b) => this.orderTasks(a, b)); //ensure same position

      let labelIds = [];
      let lastValueTask = this.labelingTasksForm.value;

      this.labelingTasksTargetMap.clear();
      let lastValueTarget = this.labelingTasksTargetForm.value;
      tasks.forEach((task) => {
        const target =
          task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE
            ? task.attribute.name
            : 'Full Record';
        labelIds.push(...task.labels.map((label) => label.id));
        if (!this.labelingTasksTargetMap.has(target))
          this.labelingTasksTargetMap.set(target, new Map<string, any>());

        this.labelingTasksTargetMap.get(target).set(task.id, task);

        if (this.labelingTasksTargetForm.value == '')
          this.labelingTasksTargetForm.setValue(target);
      });
      //no clue why timer is needed but without it the dropdown switches to the first entry while the value stays correct??
      //possible solution ? grap only whats needed and then unsubscribe --> update only nessesary values (extend/remove labels --> solution will also be needed for settings)
      if (lastValueTarget || lastValueTask)
        timer(1).subscribe(() => {
          this.labelingTasksTargetForm.setValue(lastValueTarget);
          timer(1).subscribe(() => {
            this.labelingTasksForm.setValue(lastValueTask);
          });
        });

      this.colors.domain(labelIds);
    });
  }
  orderTasks(a, b) {
    const at = a.taskTarget == LabelingTaskTarget.ON_WHOLE_RECORD ? -1 : 0;
    const bt = b.taskTarget == LabelingTaskTarget.ON_WHOLE_RECORD ? -1 : 0;
    return at - bt ||
      a.relativePosition - b.relativePosition ||
      a.name.localeCompare(b.name)
  }

  //extention from monitor page

  getLabelDistributions(projectId: string, labelingTaskId: string): void {
    const dataSliceId = this.dataSliceForm.value == "@@NO_SLICE@@" ? null : this.dataSliceForm.value;
    this.labelDistribution = null;
    this.projectApolloService.getLabelDistributions(
      projectId,
      labelingTaskId,
      dataSliceId
    ).pipe(first()).subscribe((labelDist) => {
      this.labelDistribution = this.matchAndMergeLabelDistributionData(labelDist);
      this.graphsHaveValues = labelDist.length > 0;
    });
  }

  getConfidenceDistributions(projectId: string, labelingTaskId: string): void {
    const dataSliceId = this.dataSliceForm.value == "@@NO_SLICE@@" ? null : this.dataSliceForm.value;
    this.labelDistribution = null;
    this.projectApolloService.getConfidenceDistributions(
      projectId,
      labelingTaskId,
      dataSliceId
    ).pipe(first()).subscribe((confidenceDist) => {
      this.lineChartData = confidenceDist;
    });
  }

  private matchAndMergeLabelDistributionData(data) {
    let returnData = [];
    data.forEach(e => {
      let found = returnData.find(x => x.labelId == e.id);
      if (!found) {
        found = {
          labelId: e.id,
          labelName: e.name,
          ratioScaleManually: 0,
          absoluteScaleManually: 0,
          ratioScaleProgrammatically: 0,
          absoluteScaleProgrammatically: 0
        };
        returnData.push(found);
      }
      if (e.source_type == 'MANUAL') {
        found.ratioScaleManually = e.count_relative;
        found.absoluteScaleManually = e.count_absolute;
      } else if (e.source_type == "WEAK_SUPERVISION") {
        found.ratioScaleProgrammatically = e.count_relative;
        found.absoluteScaleProgrammatically = e.count_absolute;
      }
    });
    return returnData;
  }

  getConfusionMatrix(projectId: string, labelingTaskId: string): void {
    let dataSlice = this.dataSliceForm.value;
    if (dataSlice == '@@NO_SLICE@@') dataSlice = null;
    this.confusionMatrix = null;
    this.projectApolloService.getConfusionMatrixByAttributeId(
      projectId,
      labelingTaskId,
      dataSlice
    ).pipe(first()).subscribe((values) => {
      this.confusionMatrix = values.map(e => {
        return {
          counts: e.count_absolute,
          labelIdManual: e.label_name_manual == '@@OUTSIDE@@' ? 'Outside' : e.label_name_manual,
          labelIdProgrammatic: e.label_name_ws == '@@OUTSIDE@@' ? 'Outside' : e.label_name_ws
        }
      });
    });
  }

  getInterAnnotatorMatrix(projectId: string, labelingTaskId: string): void {
    let values = this.interAnnotatorFormGroup.getRawValue();
    values.dataSlice = this.dataSliceForm.value;
    if (values.dataSlice == '@@NO_SLICE@@') values.dataSlice = null;
    this.interAnnotatorMatrix = null;
    this.projectApolloService.getInterAnnotatorAgreement(
      projectId,
      labelingTaskId,
      values.goldUser,
      values.allUsers,
      values.dataSlice
    ).pipe(first()).subscribe((matrix) => {
      this.addUserName(matrix.allUsers);
      this.interAnnotatorMatrix = matrix;
      this.calcInterAnnotatorAvg(matrix);
    });
    this.goldUserRequested = values.goldUser;
  }

  interAnnotatorSelectionChanged() {
    this.getInterAnnotatorMatrix(this.project.id, this.labelingTasksForm.value);
    this.saveSettingsToLocalStorage();
  }

  addUserName(allUsers) {
    allUsers.forEach(u => {
      let name;
      if (u.user.id == 'GOLD_STAR') name = "Gold Star";
      else {
        if (u.user.firstName) name = u.user.firstName[0] + '. ' + u.user.lastName;
        else name = "Unknown";
      }
      u.name = name;
    });
  }

  openDescription(open: boolean, projectId) {
    this.descriptionOpen = open;
    if (!open && this.description != this.project.description) {
      this.saveProjectDescription(
        projectId,
        this.project.name,
        this.description
      );
    }
  }

  isDescriptionOpen(): boolean {
    return this.descriptionOpen;
  }

  saveProjectDescription(projectId, name, newDescription) {
    this.projectApolloService
      .updateProjectNameAndDescription(projectId, name, newDescription)
      .pipe(first())
      .subscribe();
  }

  setFocus(focusArea) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }

  handleWebsocketNotification(msgParts) {
    if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created', 'weak_supervision_finished'].includes(msgParts[1])) {
      this.labelingTasksQuery$.refetch();
    } else if (['data_slice_created', 'data_slice_updated', 'data_slice_deleted'].includes(msgParts[1])) {
      this.dataSlicesQuery$.refetch();
    }
  }

}
