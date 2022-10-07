import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Observable, Subscription, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, first } from 'rxjs/operators';
import { LabelingTask, LabelingTaskTarget, labelingTaskToString } from 'src/app/base/enum/graphql-enums';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { HttpClient } from '@angular/common/http';
import { S3Service } from 'src/app/import/services/s3.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { ConfigManager } from 'src/app/base/services/config-service';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';

@Component({
  selector: 'kern-project-settings',
  templateUrl: './project-settings.component.html',
  styleUrls: ['./project-settings.component.scss'],
  styles: [
    `
      select option:disabled {
        color: #bbbbbb;
      }
    `,
  ],
})
export class ProjectSettingsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('inputTaskName') inputTaskName: QueryList<ElementRef>;
  get LabelingTaskType(): typeof LabelingTask {
    return LabelingTask;
  }

  dataTypesArray = [
    { name: 'Category', value: 'CATEGORY' },
    { name: 'Text', value: 'TEXT' },
    { name: 'Integer', value: 'INTEGER' },
    { name: 'Float', value: 'FLOAT' },
    { name: 'Boolean', value: 'BOOLEAN' },
    { name: 'Unknown', value: 'UNKNOWN' },
  ];
  granularityTypesArray = [
    { name: 'Attribute', value: 'ON_ATTRIBUTE' },
    { name: 'Token', value: 'ON_TOKEN' }
  ];

  labelColorOptions = []

  colorOptions = [
    "red", "orange", "amber",
    "yellow", "lime", "green",
    "emerald", "teal", "cyan",
    "sky", "blue", "indigo",
    "violet", "purple", "fuchsia",
    "pink", "rose"];

  //better request available from backend?
  embeddingHandlesMap: Map<string, any> = new Map<string, any>();
  labelingTasksDropdownArray = [];
  projectName = new FormControl('');
  projectNameUpdate: string = '';
  project$: any;
  projectQuery$: any;
  project: any;
  labels$: any;
  labelingTasksQuery$: any;
  attributesQuery$: any;
  subscriptions$: Subscription[] = [];
  embeddings: any;
  embeddingQuery$: any;
  embeddingCreationFormGroup: FormGroup;
  embeddingCreationBlocked: boolean = true;
  forceEmbeddingRefresh: boolean = true;
  currentEmbeddingHandle;
  requestTimeOut: boolean = false;
  projectUpdateDisabled: boolean = true;
  isTaskNameUnique: boolean = true;
  tokenizationProgress: Number;
  labelingTaskColors: Map<string, string[]> = new Map<string, string[]>();
  currentLabel: any = null;
  currentColorLabelingTaskId: any = null;

  downloadMessage: DownloadState = DownloadState.NONE;
  downloadPrepareMessage: DownloadState = DownloadState.NONE;
  ALLOWED_KEYS = "abcdefghijklmnopqrstuvwxyzöäüß<>|,.;:-_#'\"~+*?\\{}[]()=/&%$§!@^°€";
  labelHotkeyError: string;
  projectSize: any[];
  downloadSizeText: string;
  projectExportSchema = this.formBuilder.group({
    attributes: this.formBuilder.array([]),
  });
  get projectExportArray() {
    return this.projectExportSchema.get('attributes') as FormArray;
  }

  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }

  attributesSchema = this.formBuilder.group({
    attributes: this.formBuilder.array([]),
  });
  get attributesArray() {
    return this.attributesSchema.get('attributes') as FormArray;
  }

  attributesArrayTextUsableUploaded: { id: string, name: string }[] = [];
  attributesArrayUsableUploaded: { id: string, name: string }[] = [];
  attributes;
  pKeyCheckTimer;
  pKeyValid: boolean = null;
  projectExportCredentials: any;

  labelingTasksSchema = this.formBuilder.group({
    labelingTasks: this.formBuilder.array([]),
  });
  get labelingTasksArray() {
    return this.labelingTasksSchema.get('labelingTasks') as FormArray;
  }
  labelMap: Map<string, []> = new Map<string, []>();
  @ViewChild('modalInput', { read: ElementRef }) myModalnewRecordTask: ElementRef;
  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  downloadedModels: any[];
  isManaged: boolean = true;

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private router: Router,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private s3Service: S3Service,
    private informationSourceApolloService: WeakSourceApolloService
  ) { }

  ngAfterViewInit() {
    this.inputTaskName.changes.subscribe(() => {
      this.setFocus(this.inputTaskName);
    });
  }
  setFocus(focusArea) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }
  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);

    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(projectId);
    this.project$.subscribe((project) => this.project = project);

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: ['tokenization', 'embedding', 'embedding_deleted', 'label_created', 'label_deleted', 'attributes_updated', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created', 'project_update', 'project_export', 'calculate_attribute'],
      func: this.handleWebsocketNotification
    });
    this.setUpCommentRequests(projectId);

    this.requestPKeyCheck(projectId);
    this.checkProjectTokenization(projectId);

    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.informationSourceApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => this.downloadedModels = downloadedModels));

    let preparationTasks$ = [];
    preparationTasks$.push(this.prepareAttributesRequest(projectId));
    preparationTasks$.push(this.prepareLabelingTasksRequest(projectId));
    preparationTasks$.push(this.prepareEmbeddingsRequest(projectId));

    this.colorOptions.forEach(color => this.labelColorOptions.push({
      name: color, background: `bg-${color}-100`, text: `text-${color}-700`, border: `border-${color}-400`, hover: `hover:bg-${color}-200`
    }));

    const openModal = JSON.parse(localStorage.getItem("openModal"));
    if (openModal) {
      const subscription = interval(250).subscribe(() => {
        if (this.myModalnewRecordTask) {
          this.myModalnewRecordTask.nativeElement.checked = true;
          localStorage.removeItem("openModal");
          subscription.unsubscribe();
        }
      })
    }
    this.checkIfManagedVersion();
  }
  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
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

  prepareEmbeddingFormGroup(attributes) {
    if (attributes.length > 0) {
      this.embeddingCreationFormGroup = this.formBuilder.group({
        targetAttribute: attributes[0].id,
        embeddingHandle: "",
        granularity: this.granularityTypesArray[0].value
      });
      this.embeddingCreationFormGroup.valueChanges.pipe(debounceTime(200)).subscribe(() =>
        this.embeddingCreationBlocked = !this.canCreateEmbedding()
      )
    }
  }

  checkProjectTokenization(projectId: string) {
    this.projectApolloService.getProjectTokenization(projectId).pipe(first()).subscribe((v) => {
      this.tokenizationProgress = v?.progress;
    })
  }

  buildExpectedEmbeddingName(): string {
    const values = this.embeddingCreationFormGroup.getRawValue();
    let toReturn = this.getAttributeArrayAttribute(values.targetAttribute, 'name');
    toReturn += "-" + (values.granularity == 'ON_ATTRIBUTE' ? 'classification' : 'extraction');
    toReturn += "-" + values.embeddingHandle;

    return toReturn;
  }

  canCreateEmbedding(): boolean {
    const currentName = this.buildExpectedEmbeddingName();
    if (currentName.slice(-1) == "-") return false;
    else {
      this.embeddingCreationBlocked = true;
      for (const embedding of this.embeddings) {
        if (embedding.name == currentName) return false;
      }
    }
    return true;
  }

  prepareEmbeddingHandles(projectId: string, attributes) {
    this.projectApolloService.getRecomendedEncodersForEmbeddings(projectId).pipe(first()).subscribe((encoderSuggestions) => {
      if (!this.project) {
        let timer = interval(250).subscribe(() => {
          if (this.project) {
            this.parseEncoderToSuggestions(encoderSuggestions, attributes);
            timer.unsubscribe();
          }
        });
      } else {
        this.parseEncoderToSuggestions(encoderSuggestions, attributes);
      }
    })
  }

  private parseEncoderToSuggestions(encoderSuggestions, attributes) {
    encoderSuggestions = encoderSuggestions.filter(e => e.tokenizers.includes("all") || e.tokenizers.includes(this.project.tokenizer))
    if (!encoderSuggestions.length) return;
    if (encoderSuggestions) encoderSuggestions.forEach(element => {
      element.hidden = false;
      element.forceHidden = false;
      if (typeof element.applicability === 'string' || element.applicability instanceof String) {
        element.applicability = JSON.parse(element.applicability);
      }
    });
    attributes.forEach(att => {
      this.embeddingHandlesMap.set(att.id, encoderSuggestions);
    })
  }

  checkForceHiddenHandles() {
    const granularity = this.embeddingCreationFormGroup.get('granularity').value;
    const attId = this.embeddingCreationFormGroup.get('targetAttribute').value;

    const suggestionList = this.embeddingHandlesMap.get(attId)
    for (let element of suggestionList) {
      element.forceHidden = true;
      if ((granularity == 'ON_ATTRIBUTE' && element.applicability?.attribute)
        || (granularity == 'ON_TOKEN' && element.applicability?.token)) {
        element.forceHidden = false;
      }
    }

  }

  prepareEmbeddingsRequest(projectId: string) {
    let embeddings$;
    [this.embeddingQuery$, embeddings$] = this.projectApolloService.getEmbeddingSchema(projectId);

    this.subscriptions$.push(embeddings$.subscribe((embeddings) => this.embeddings = embeddings));
    return embeddings$;
  }

  prepareAttributesRequest(projectId: string): Observable<any> {
    let attributes$;
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId, ['ALL']);
    this.subscriptions$.push(attributes$.subscribe((attributes) => {
      this.attributes = attributes;
      this.attributesArrayTextUsableUploaded = [];
      this.attributesArrayUsableUploaded = [];
      this.attributesArray.clear();
      attributes.forEach((att) => {
        let group = this.formBuilder.group({
          id: att.id,
          name: att.name,
          dataType: att.dataType,
          isPrimaryKey: att.isPrimaryKey,
          userCreated: att.userCreated,
          sourceCode: att.sourceCode,
          state: att.state
        });
        if (att.state == 'INITIAL') {
          group.get('isPrimaryKey').disable();
        }
        group.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
          let values = group.getRawValue(); //to ensure disabled will be returned as well          
          if (this.pKeyChanged()) this.requestPKeyCheck(this.project.id);
          if (this.attributeChangedToText()) this.createAttributeTokenStatistics(this.project.id, values.id);
          this.projectApolloService.
            updateAttribute(this.project.id, values.id, values.dataType, values.isPrimaryKey).pipe(first()).subscribe();
        });
        this.attributesArray.push(group);
        if (att.state == 'UPLOADED' || att.state == 'USABLE' || att.state == 'AUTOMATICALLY_CREATED') {
          if (att.dataType == 'TEXT') {
            this.attributesArrayTextUsableUploaded.push({ id: att.id, name: att.name });
            this.attributesArrayUsableUploaded.push({ id: att.id, name: att.name });
          } else {
            this.attributesArrayUsableUploaded.push({ id: att.id, name: att.name });
          }
        }
      });
      const onlyTextAttributes = attributes.filter(a => a.dataType == 'TEXT');
      this.prepareEmbeddingFormGroup(onlyTextAttributes);
      this.prepareEmbeddingHandles(projectId, onlyTextAttributes);

    }));
    return attributes$;
  }

  attributeChangedToText(): boolean {
    for (let i = 0; i < this.attributes.length; i++) {
      const att = this.attributes[i]
      const wantedDataType = this.getAttributeArrayAttribute(att.id, 'dataType');
      if (att.dataType != wantedDataType && wantedDataType == "TEXT") return true;
    }
    return false;
  }

  createAttributeTokenStatistics(projectId: string, attributeId: string) {
    this.projectApolloService.createAttributeTokenStatistics(projectId, attributeId).pipe(first()).subscribe();
  }

  requestPKeyCheck(projectId: string) {
    this.pKeyValid = null;
    if (this.pKeyCheckTimer) this.pKeyCheckTimer.unsubscribe();
    this.pKeyCheckTimer = timer(500).subscribe(() => {
      this.projectApolloService.getCompositeKeyIsValid(projectId).pipe(first()).subscribe((r) => {
        this.pKeyCheckTimer = null;
        if (this.anyPKey()) this.pKeyValid = r;
        else this.pKeyValid = null;
      })
    });
  }

  anyPKey(): boolean {
    if (!this.attributes) return false;
    for (let i = 0; i < this.attributes.length; i++) {
      const att = this.attributes[i]
      if (att.isPrimaryKey) return true;
    }
    return false;
  }

  pKeyChanged(): boolean {
    for (let i = 0; i < this.attributes.length; i++) {
      const att = this.attributes[i]
      if (att.isPrimaryKey != this.getAttributeArrayAttribute(att.id, 'isPrimaryKey')) return true;
    }
    return false;
  }

  prepareLabelingTasksRequest(projectId: string) {
    let labelingTasks$;
    [this.labelingTasksQuery$, labelingTasks$] = this.projectApolloService.getLabelingTasksByProjectId(projectId);
    this.subscriptions$.push(labelingTasks$.subscribe((tasks) => {

      tasks.sort((a, b) => a.relativePosition - b.relativePosition || a.name.localeCompare(b.name))

      if (this.onlyLabelsChanged(tasks)) {
        this.labelMap.clear();
        tasks.forEach((task) => {
          task.labels.sort((a, b) => a.name.localeCompare(b.name));
          this.labelMap.set(task.id, task.labels);
        });
      } else {
        this.labelingTasksArray.clear();
        tasks.forEach((task) => {
          task.labels.sort((a, b) => a.name.localeCompare(b.name));
          this.labelingTaskColors.set(task.id, task.labels.map((label) => label.color));
          let group = this.formBuilder.group({
            id: task.id,
            name: task.name,
            nameOpen: false,
            targetId: task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE ? task.attribute.id : "",
            targetName: task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE ? task.attribute.name : "Full Record",
            taskType: task.taskType,
          })
          this.labelMap.set(task.id, task.labels);
          group.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
            let values = group.getRawValue(); //to ensure disabled will be returned as well
            if (values.nameOpen || !this.isTaskNameUniqueCheck(values.name, group) || values.name.trim() == "") return;
            this.projectApolloService.
              updateLabelingTask(this.project.id, values.id, values.name, values.taskType, values.targetId == "" ? null : values.targetId).pipe(first()).subscribe();
          });
          this.labelingTasksArray.push(group);
        });
      }

    }));
    return labelingTasks$;
  }

  onlyLabelsChanged(tasks): boolean {
    if (this.labelingTasksArray.controls.length == 0) return false;
    if (this.labelingTasksArray.controls.length != tasks.length) return false;
    for (const task of tasks) {
      if (this.getTaskArrayAttribute(task.id, 'id') == 'UNKNOWN') return false;
      if (this.getTaskArrayAttribute(task.id, 'taskType') != task.taskType)
        return false;
      if (this.getTaskArrayAttribute(task.id, 'name') != task.name)
        return false;
    }

    return true;
  }

  getTaskO(name: string): boolean {
    if (name == '') return true;
    for (let task of this.labelingTasksArray.controls) {
      if (name == task.get('name').value) return false;
    }
    return true;
  }


  addLabelingTask(
    projectId: string,
    modalInputToClose: HTMLInputElement,
    taskName: string,
    taskTargetId: string = null
  ) {
    if (this.requestTimeOut) return;
    if (taskName.trim().length == 0) return;
    if (!this.isTaskNameUniqueCheck(taskName)) return;
    if (taskTargetId == "@@NO_ATTRIBUTE@@") taskTargetId = null;
    let labelingTaskType = LabelingTask.MULTICLASS_CLASSIFICATION;
    if (
      taskTargetId &&
      this.getAttributeArrayAttribute(taskTargetId, 'dataType') == 'TEXT'
    )
      labelingTaskType = LabelingTask.NOT_SET;

    this.projectApolloService.addLabelingTask(projectId, taskName.trim(), labelingTaskType, taskTargetId)
      .pipe(first()).subscribe();

    this.requestTimeOut = true;
    timer(100).subscribe(() => this.requestTimeOut = false);


    modalInputToClose.checked = false;
  }

  getAttributeArrayAttribute(attributeId: string, valueID: string) {
    for (let att of this.attributesArray.controls) {
      if (attributeId == att.get('id').value) return att.get(valueID).value;
    }
    return 'UNKNOWN';
  }

  getTaskArrayAttribute(taskId: string, valueID: string) {
    for (let task of this.labelingTasksArray.controls) {
      if (taskId == task.get('id').value) return task.get(valueID).value;
    }
    return 'UNKNOWN';
  }

  removeLabel(projectId: string, taskId: string, labelId: string, labelColor: string) {
    let colorsInTask = this.labelingTaskColors.get(taskId);

    const index = colorsInTask.indexOf(labelColor);
    if (index > -1) {
      colorsInTask.splice(index, 1); // 2nd parameter means remove one item only
    }
    this.labelingTaskColors.set(taskId, colorsInTask);

    this.projectApolloService
      .deleteLabel(projectId, labelId).pipe(first())
      .subscribe();
  }

  addLabel(
    projectId: string,
    taskId: string,
    labelInput: HTMLInputElement
  ): void {
    if (this.requestTimeOut) return;
    if (!labelInput.value) return;
    if (!this.isLabelNameUnique(taskId, labelInput.value)) return;
    let labelColor = "yellow"
    let colorsInTask = this.labelingTaskColors.get(taskId);
    if (colorsInTask.length > 0) {
      const availableColors = this.colorOptions.filter(x => !colorsInTask.includes(x));
      if (availableColors.length > 0) {
        labelColor = availableColors[0]
        colorsInTask.push(labelColor);
        this.labelingTaskColors.set(taskId, colorsInTask);
      }
    } else {
      this.labelingTaskColors.set(taskId, [labelColor])
    }
    this.projectApolloService
      .createLabel(projectId, taskId, labelInput.value, labelColor).pipe(first())
      .subscribe();

    labelInput.value = '';
    labelInput.focus();
    this.requestTimeOut = true;
    timer(100).subscribe(() => this.requestTimeOut = false);
  }

  deleteProject(projectId: string) {
    this.projectApolloService
      .deleteProjectById(projectId)
      .pipe(first()).subscribe();

    this.router.navigate(['projects']);
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  updateProjectNameAndDescription(projectId: string, newName: string, newDescription: string) {
    if (newName == '' && newDescription == '') return;
    if (newName == '') {
      newName = this.project.name;
    }
    if (newDescription == '') {
      newDescription = this.project.description;
    }
    this.projectApolloService.updateProjectNameAndDescription(projectId, newName.trim(), newDescription.trim()).pipe(first()).subscribe();
  }

  labelingTasksDropdownValues() {
    if (this.labelingTasksDropdownArray.length == 0) {
      for (let t of Object.values(LabelingTask)) {
        if (t == LabelingTask.NOT_USEABLE) continue;
        this.labelingTasksDropdownArray.push({
          name: labelingTaskToString(t),
          value: t,
        });
      }
    }
    return this.labelingTasksDropdownArray;
  }

  deleteLabelingTask(projectId: string, taskId: string) {
    this.projectApolloService
      .deleteLabelingTask(projectId, taskId).pipe(first())
      .subscribe((x) => this.removeOverviewLocalStorageValues());
  }

  openTaskName(task: FormGroup) {
    task.get("nameOpen").setValue(true);
  }
  checkTaskNameColor(target: HTMLInputElement) {
    if (this.isTaskNameUniqueCheck(target.value)) {
      target.style.color = null;
      target.style.fontWeight = null;
    } else {
      target.style.color = 'red';
      target.style.fontWeight = 'bold';
    }

  }

  changeTaskName(task: FormGroup, value: string) {
    task.get("nameOpen").setValue(false);
    if (value.trim() == "") return;
    if (!this.isTaskNameUniqueCheck(value)) return;
    const taskTarget = task.get("targetId").value == "" ? null : task.get("targetId").value;
    this.projectApolloService.updateLabelingTask(this.project.id, task.get("id").value, value, task.get("taskType").value, taskTarget)
      .pipe(first()).subscribe((r: any) => {
        if (r.data?.updateLabelingTask?.ok) {
          task.get("name").setValue(value);
        }
      });
  }

  focusModalInputBox(event: Event, inputBoxName: string) {
    if (event.target instanceof HTMLInputElement) {
      const modalDiv = event.target.nextSibling;
      if (modalDiv instanceof HTMLElement) {
        const inputChildren = modalDiv.getElementsByTagName('INPUT');
        for (var i = 0; i < inputChildren.length; ++i) {
          var node = inputChildren[i];
          if (
            node instanceof HTMLElement &&
            node.getAttribute('name') == inputBoxName
          ) {
            node.focus();
            return;
          }
        }
      }
    }
  }

  isTaskNameUniqueCheck(name: string, ownGroup: FormGroup = null): boolean {
    if (name == '') return true;
    const nameToExclude = ownGroup ? ownGroup.get("name").value : "";
    let taskName;
    for (let task of this.labelingTasksArray.controls) {
      taskName = task.get('name').value;
      if (name == taskName && taskName != nameToExclude) return false;
    }
    return true;
  }

  isLabelNameUnique(taskId: string, name: string): boolean {
    if (name == '') return true;
    for (let label of this.labelMap.get(taskId)) {
      if (label['name'] == name) return false;
    }

    return true;
  }

  attributeAlreadyHasInformationExtraction(attributeId: string): boolean {
    for (let task of this.labelingTasksArray.controls) {
      if (attributeId == task.get('targetId').value) {
        if (task.get('taskType').value == LabelingTask.INFORMATION_EXTRACTION)
          return true;
      }
    }
    return false;
  }

  isLabelingTaskOptionDisabled(task: AbstractControl, dropdownValue: string) {
    const targetID = task.get('targetId').value;
    if (
      targetID != '' &&
      dropdownValue == LabelingTask.INFORMATION_EXTRACTION
    ) {
      if (this.attributeAlreadyHasInformationExtraction(targetID)) return true;
      else if (this.getAttributeArrayAttribute(targetID, 'dataType') != 'TEXT')
        return true;
    } else if (
      targetID == '' &&
      dropdownValue == LabelingTask.INFORMATION_EXTRACTION
    )
      return true;
    return false;
  }

  deleteEmbedding(embeddingId: string) {
    this.projectApolloService
      .deleteEmbedding(this.project.id, embeddingId).pipe(first())
      .subscribe(() => {
        this.embeddings = this.embeddings.filter(e => e.id != embeddingId);
        this.embeddingCreationBlocked = !this.canCreateEmbedding();
      });
  }

  addEmbedding(projectId: string, modalInputToClose: HTMLInputElement) {
    if (!this.canCreateEmbedding()) return;
    const embeddingHandle = this.embeddingCreationFormGroup.get("embeddingHandle").value;
    const attributeId = this.embeddingCreationFormGroup.get("targetAttribute").value;
    const granularity = this.embeddingCreationFormGroup.get("granularity").value;

    this.projectApolloService.createEmbedding(projectId, attributeId, embeddingHandle, granularity.substring(3)).pipe(first()).subscribe();
    modalInputToClose.checked = false;
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    const suggestionList = this.embeddingHandlesMap.get(this.embeddingCreationFormGroup.get("targetAttribute").value)
    for (let embeddingHandle of suggestionList) {
      if (!embeddingHandle.hidden && !embeddingHandle.forceHidden) {
        this.selectEmbeddingHandle(embeddingHandle, inputElement);
        return;
      }
    }

  }

  selectEmbeddingHandle(embeddingHandle, inputElement: HTMLInputElement) {
    inputElement.value = embeddingHandle.configString;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingHandles(inputElement);
  }

  checkEmbeddingHandles(eventTarget: HTMLInputElement) {
    this.embeddingCreationFormGroup.get('embeddingHandle').setValue(eventTarget.value);
    const suggestionList = this.embeddingHandlesMap.get(this.embeddingCreationFormGroup.get("targetAttribute").value)
    if (!suggestionList || suggestionList.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    for (let embeddingHandle of suggestionList) {
      embeddingHandle.hidden = !embeddingHandle.configString.toLowerCase().includes(lowerEventValue)
    }

  }

  checkLabelingTaskName(eventTarget: HTMLInputElement) {
    this.isTaskNameUnique = this.isTaskNameUniqueCheck(eventTarget.value);
  }

  checkAndModifyLabelName(eventTarget: HTMLInputElement) {
    eventTarget.value = eventTarget.value.replace("-", " ")
  }

  setCurrentEmbeddingHandle(embeddingHandle, hoverBox: HTMLElement, listElement: HTMLElement) {
    this.currentEmbeddingHandle = embeddingHandle;
    if (embeddingHandle) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  checkProjectUpdateDisabled(name: string, description: string) {
    this.projectUpdateDisabled = (name == "" && description == "");
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'embedding') {
      if (!this.embeddings) return;
      if (msgParts[4] == "INITIALIZING") {
        timer(100).subscribe(() => this.embeddingQuery$.refetch());
        return;
      }
      for (let e of this.embeddings) {
        if (e.id == msgParts[2]) {
          if (msgParts[3] == "state") {
            if (msgParts[4] == "FINISHED") this.embeddingQuery$.refetch();
            else e.state = msgParts[4];
          }
          else if (msgParts[3] == "progress") e.progress = Number(msgParts[4])
          else console.log("unknown websocket message in part 3:" + msgParts[3], "full message:", msgParts)
          return;
        }
      }
    } else if (msgParts[1] == 'tokenization' && msgParts[2] == 'docbin') {
      if (msgParts[3] == 'progress') {
        this.tokenizationProgress = Number(msgParts[4]);
      } else if (msgParts[3] == 'state') {
        if (msgParts[4] == 'IN_PROGRESS') this.tokenizationProgress = 0;
        else if (msgParts[4] == 'FINISHED') {
          timer(5000).subscribe(() => this.checkProjectTokenization(this.project.id));
        }
      }

    } else if (msgParts[1] == 'embedding_deleted') {
      if (!this.embeddings) return;
      this.embeddings = this.embeddings.filter(e => e.id != msgParts[2]);
      return;
    } else if (msgParts[1] == 'attributes_updated') {
      this.attributesQuery$.refetch();
    } else if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created'].includes(msgParts[1])) {
      this.labelingTasksQuery$.refetch();
    } else if ('project_update' == msgParts[1]) {
      this.projectQuery$.refetch();
    } else if (msgParts[1] == 'project_export') {
      this.downloadPrepareMessage = DownloadState.NONE;
      this.requestProjectExportCredentials();
    } else if (msgParts[1] == 'calculate_attribute') {
      this.attributesQuery$.refetch();
    }
  }

  private downloadText(filename, text) {
    if (!text) return;
    const element = document.createElement('a');

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

  private downloadBlob(byteData: any, filename = 'file.zip') {
    const blob = new Blob([byteData], {
      type: "application/octet-stream"
    })
    const blobUrl = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    document.body.removeChild(link);
  }

  requestProjectExportCredentials() {
    this.projectApolloService.getLastProjectExportCredentials(this.project.id).pipe(first()).subscribe((c) => {
      if (!c) this.projectExportCredentials = null;
      else {
        this.projectExportCredentials = JSON.parse(c);
        const parts = this.projectExportCredentials.objectName.split("/");
        this.projectExportCredentials.downloadFileName = parts[parts.length - 1];
      }
    });
  }


  prepareDownload(projectId: string) {
    if (this.downloadPrepareMessage == DownloadState.PREPARATION || this.downloadPrepareMessage == DownloadState.DOWNLOAD) return;
    this.downloadPrepareMessage = DownloadState.PREPARATION;
    const exportOptions = this.buildJsonExportOptions();
    this.projectApolloService.prepareProjectExport(projectId, exportOptions).pipe(first()).subscribe();
    this.projectExportCredentials = null;
  }

  exportViaFile(isText: boolean) {
    if (!this.projectExportCredentials) return;
    this.downloadPrepareMessage = DownloadState.DOWNLOAD;
    const fileName = this.projectExportCredentials.downloadFileName;
    this.s3Service.downloadFile(this.projectExportCredentials, isText).subscribe((data) => {
      if (isText) this.downloadText(fileName, data);
      else this.downloadBlob(data, fileName);
      timer(5000).subscribe(
        () => (this.downloadPrepareMessage = DownloadState.NONE)
      );
    });
  }

  requestFileExport(projectId: string): void {
    this.downloadMessage = DownloadState.PREPARATION;
    this.projectApolloService.exportRecords(projectId).subscribe((e) => {
      this.downloadMessage = DownloadState.DOWNLOAD;
      const downloadContent = JSON.parse(e);
      this.downloadText('export.json', downloadContent);
      const timerTime = Math.max(2000, e.length * 0.0001);
      timer(timerTime).subscribe(
        () => (this.downloadMessage = DownloadState.NONE)
      );
    });
  }

  requestProjectSize() {
    this.projectSize = null;
    this.projectExportArray.clear();
    this.prepareProjectDownload(this.project.id);
  }

  buildJsonExportOptions(): string {
    let toReturn = {}
    const values = this.projectExportArray.getRawValue();
    for (const element of values) {
      if (element.export) toReturn[element.name] = true;
    }
    return JSON.stringify(toReturn)
  }

  calculateSelectedSize() {
    let downloadSize: number = 0;
    const values = this.projectExportArray.getRawValue();
    for (const element of values) {
      if (element.export) downloadSize += element.sizeNumber;
    }
    if (downloadSize) {
      var i = Math.floor(Math.log(downloadSize) / Math.log(1024));
      this.downloadSizeText = Number((downloadSize / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['bytes', 'kB', 'MB', 'GB', 'TB'][i];
    } else {
      this.downloadSizeText = "0 bytes";
    }
  }

  getMoveRight(tblName: string): boolean {
    //at some point a better grouping would be usefull 
    switch (tblName) {
      case "embedding tensors":
      case "information sources payloads":
        return true;
      default:
        return false;
    }
  }

  prepareProjectDownload(projectId: string) {
    this.projectApolloService.getProjectSize(projectId).pipe(first()).subscribe((size) => {
      this.projectSize = size;
      size.forEach((element) => {
        let group = this.formBuilder.group({
          export: element.default,
          moveRight: this.getMoveRight(element.table),
          name: element.table,
          desc: element.description,
          sizeNumber: element.byteSize,
          sizeReadable: element.byteReadable
        });
        if (element.table == 'basic project data') {
          group.disable();
        } else {
          group.valueChanges.pipe(distinctUntilChanged()).subscribe(() => this.calculateSelectedSize());
        }
        this.projectExportArray.push(group);
      });
      this.calculateSelectedSize();
    });
  }

  updateLabelColor(projectId: string, labelingTaskId: string, labelId: string, oldLabelColor: string, newLabelColor: string) {
    let colorsInTask = this.labelingTaskColors.get(labelingTaskId);
    const index = colorsInTask.indexOf(oldLabelColor);
    if (index > -1) {
      colorsInTask.splice(index, 1); // 2nd parameter means remove one item only
    }
    colorsInTask.push(newLabelColor);
    this.labelingTaskColors.set(labelingTaskId, colorsInTask);

    this.projectApolloService
      .updateLabelColor(projectId, labelId, newLabelColor).pipe(first())
      .subscribe();
  }
  checkAndSetLabelHotkey(event: KeyboardEvent) {
    this.labelHotkeyError = null;
    if (event.key == this.currentLabel.hotkey) return;
    const usedHotkeys = this.getUsedHotkey();
    if (event.key == 'ArrowRight' || event.key == 'ArrowLeft') {
      this.labelHotkeyError = "Key " + event.key + " is used to navigate between records."
      return;
    } else if (usedHotkeys.includes(event.key)) {
      this.labelHotkeyError = "Key " + event.key + " is already in use."
      return;
    } else if ('123456789'.includes(event.key)) {
      this.labelHotkeyError = "Key " + event.key + " is used to switch between users."
      return;
    } else if (!this.isValidKey(event.key)) {
      this.labelHotkeyError = "Key " + event.key + " not in whitelist."
      return;
    }
    this.currentLabel.hotkey = this.labelHotkeyError ? "" : event.key;
    if (!this.labelHotkeyError) {
      this.projectApolloService
        .updateLabelHotkey(this.project.id, this.currentLabel.id, event.key.toLowerCase()).pipe(first())
        .subscribe();
    }

  }
  getUsedHotkey(): string[] {
    let usedHotkeys = [];
    this.labelMap.forEach((value, key) => {
      value.forEach((v: any) => {
        if (v.hotkey) usedHotkeys.push(v.hotkey);
      })
    })
    return usedHotkeys
  }

  isValidKey(key: string): boolean {
    return this.ALLOWED_KEYS.includes(key.toLowerCase());
  }


  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.currentLabel) return;
    this.checkAndSetLabelHotkey(event);
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


  removeOverviewLocalStorageValues() {
    let currentData = JSON.parse(localStorage.getItem("projectOverviewData"));
    if (!currentData || !currentData[this.project.id]) return;
    delete currentData[this.project.id];
    localStorage.setItem('projectOverviewData', JSON.stringify(currentData));
  }

  checkIfModelIsDownloaded(modelName: string) {
    const findModel = this.downloadedModels && this.downloadedModels.find(el => el.name === modelName);
    return findModel !== undefined ? true : false;
  }

  createUserAttribute() {
    this.projectApolloService
      .createUserAttribute(this.project.id)
      .pipe(first())
      .subscribe((res) => {
        const id = res?.data?.createUserAttribute.attributeId;
        if (id) {
          localStorage.setItem("isNewAttribute", "true");
          this.router.navigate(['../attributes/' + id],
            {
              relativeTo: this.activatedRoute
            });
        }
      });
  }
}
