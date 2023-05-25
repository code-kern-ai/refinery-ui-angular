import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, interval, Subscription, timer } from 'rxjs';
import { distinctUntilChanged, first } from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { S3Service } from 'src/app/import/services/s3.service';
import { ConfigManager } from 'src/app/base/services/config-service';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { dataTypes } from 'src/app/util/data-types';
import { toPythonFunctionName } from 'src/app/util/helper-functions';
import { createDefaultSettingModals, SettingModals } from './helper/modal-helper';
import { attributeVisibilityStates } from '../create-new-attribute/attributes-visibility-helper';
import { DataHandlerHelper } from './helper/data-handler-helper';
import { Project } from 'src/app/base/entities/project';
import { Embedding } from './entities/embedding.type';
import { Attribute } from './entities/attribute.type';
import { downloadBlob, downloadText } from 'src/app/util/download-helper-functions';
import { findFreeAttributeName, getMoveRight } from './helper/project-settings-helper';
import { LabelHelper } from './helper/label-helper';
import { AttributeCalculationState } from '../create-new-attribute/create-new-attribute-helper';
import { formatBytes, jsonCopy } from 'submodules/javascript-functions/general';

@Component({
  selector: 'kern-project-settings',
  templateUrl: './project-settings.component.html',
  styleUrls: ['./project-settings.component.scss'],
})
export class ProjectSettingsComponent implements OnInit, OnDestroy {
  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }

  dataTypesArray = dataTypes;
  project$: any;
  projectQuery$: any;
  project: Project;
  attributesQuery$: any;
  attributes$: any;
  subscriptions$: Subscription[] = [];
  embeddings: Embedding[];
  combineLatestResultBackup: any[];
  embeddingQuery$: any;
  tokenizationProgress: Number;
  downloadMessage: DownloadState = DownloadState.NONE;
  embeddingHandles: { [embeddingId: string]: any } = {};
  isManaged: boolean = false;
  attributeVisibilityStates = attributeVisibilityStates;
  settingModals: SettingModals = createDefaultSettingModals();
  dataHandlerHelper: DataHandlerHelper;
  attributes: Attribute[] = [];
  useableTextAttributes: Attribute[];
  useableAttributes: Attribute[];
  embeddings$: any;
  suggestions$: any;
  lh: LabelHelper;
  checkIfAcUploadedRecords: boolean = false;
  isAcRunning: boolean = false;

  get projectExportArray() {
    return this.settingModals.projectExport.projectExportSchema.get('attributes') as FormArray;
  }

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private router: Router,
    private formBuilder: FormBuilder,
    private s3Service: S3Service
  ) {
    this.dataHandlerHelper = new DataHandlerHelper(this.formBuilder, this.projectApolloService);
    this.lh = new LabelHelper(this, this.projectApolloService);
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: ['tokenization', 'embedding', 'embedding_deleted', 'label_created', 'label_deleted', 'attributes_updated', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created', 'project_update', 'project_export', 'calculate_attribute'],
      func: this.handleWebsocketNotification
    });
    this.setUpCommentRequests(projectId);
    this.checkProjectTokenization(projectId);

    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(projectId);
    this.subscriptions$.push(this.project$.subscribe((project) => this.project = project));
    this.project$.pipe(first()).subscribe((project) => {
      [this.attributesQuery$, this.attributes$] = this.dataHandlerHelper.prepareAttributesRequest(projectId);
      [this.embeddingQuery$, this.embeddings$] = this.dataHandlerHelper.prepareEmbeddingsRequest(projectId);
      this.suggestions$ = this.projectApolloService.getRecommendedEncodersForEmbeddings(projectId);
      let tasks$ = [];
      tasks$.push(this.attributes$);
      tasks$.push(this.embeddings$);
      tasks$.push(this.suggestions$);

      combineLatest(tasks$).subscribe((res: any[]) => {
        this.combineLatestResultBackup = res;
        this.prepareCombineLatestResults(projectId);

      });
    })

    const openModal = JSON.parse(localStorage.getItem("openModal"));
    if (openModal) {
      const subscription = interval(250).subscribe(() => {
        if (this.settingModals.labelingTask.create) {
          this.settingModals.labelingTask.create.open = true;
          this.dataHandlerHelper.focusModalInputBox('labelingTaskName');
          localStorage.removeItem("openModal");
          subscription.unsubscribe();
        }
      })
    }
    this.initForms();
    this.checkIfManagedVersion();
  }

  private prepareCombineLatestResults(projectId: string) {
    // prepare attributes
    this.attributes = this.combineLatestResultBackup[0];
    this.useableTextAttributes = this.combineLatestResultBackup[0];
    this.attributes.forEach((attribute) => {
      attribute.dataTypeName = this.dataTypesArray.find((type) => type.value === attribute?.dataType).name;
      attribute.visibilityIndex = this.attributeVisibilityStates.findIndex((type) => type.value === attribute?.visibility);
    });
    this.dataHandlerHelper.requestPKeyCheck(projectId, this.attributes);
    this.isAcRunning = this.checkIfAcIsRunning();

    // prepare embeddings
    this.embeddings = jsonCopy(this.combineLatestResultBackup[1]);
    this.dataHandlerHelper.extendQueuedEmbeddings(projectId, this.embeddings);

    this.useableTextAttributes = this.useableTextAttributes.filter((attribute: any) => (attribute.state == AttributeCalculationState.UPLOADED || attribute.state == AttributeCalculationState.AUTOMATICALLY_CREATED || attribute.state == AttributeCalculationState.USABLE) && attribute.dataType == 'TEXT');
    this.useableAttributes = this.attributes.filter((attribute: any) => (attribute.state == AttributeCalculationState.UPLOADED || attribute.state == AttributeCalculationState.AUTOMATICALLY_CREATED || attribute.state == AttributeCalculationState.USABLE));

    // prepare embedding suggestions
    const onlyTextAttributes = this.attributes.filter(a => a.dataType == 'TEXT');
    this.dataHandlerHelper.prepareEmbeddingFormGroup(onlyTextAttributes, this.settingModals, this.embeddings);
    this.embeddingHandles = this.dataHandlerHelper.prepareEmbeddingHandles(projectId, onlyTextAttributes, this.project.tokenizer, this.combineLatestResultBackup[2]);
  }

  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.EMBEDDING, projectId: projectId });
    requests.push({ commentType: CommentType.LABEL, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  private initForms() {
    this.settingModals.projectExport.projectExportSchema = this.formBuilder.group({
      attributes: this.formBuilder.array([]),
    });
  }

  checkIfManagedVersion() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfManagedVersion());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }

  checkProjectTokenization(projectId: string) {
    this.projectApolloService.getProjectTokenization(projectId).pipe(first()).subscribe((v) => {
      this.tokenizationProgress = v?.progress;
      this.isAcRunning = this.checkIfAcIsRunning();
    })
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'embedding') {
      if (!this.embeddings) return;
      if (["queued", "dequeued"].includes(msgParts[2])) {
        this.prepareCombineLatestResults(this.project.id);
        return;
      }
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
    }
    else if ('project_update' == msgParts[1]) {
      this.projectQuery$.refetch();
    } else if (msgParts[1] == 'project_export') {
      this.settingModals.projectExport.downloadPrepareMessage = DownloadState.NONE;
      this.requestProjectExportCredentials();
    } else if (msgParts[1] == 'calculate_attribute') {
      if (msgParts[2] == 'started' && msgParts[3] == 'all') {
        this.checkIfAcUploadedRecords = true;
        this.isAcRunning = this.checkIfAcIsRunning();
      } else if (msgParts[2] == 'finished' && msgParts[3] == 'all') {
        this.checkIfAcUploadedRecords = false;
        this.isAcRunning = this.checkIfAcIsRunning();
        timer(500).subscribe(() => this.checkProjectTokenization(this.project.id));
      } else {
        this.attributesQuery$.refetch();
        this.isAcRunning = this.checkIfAcIsRunning();
        if (msgParts[2] == 'finished') timer(500).subscribe(() => this.checkProjectTokenization(this.project.id));
      }
    }
  }

  requestProjectExportCredentials() {
    this.projectApolloService.getLastProjectExportCredentials(this.project.id).pipe(first()).subscribe((c) => {
      if (!c) this.settingModals.projectExport.projectExportCredentials = null;
      else {
        this.settingModals.projectExport.projectExportCredentials = JSON.parse(c);
        const parts = this.settingModals.projectExport.projectExportCredentials.objectName.split("/");
        this.settingModals.projectExport.projectExportCredentials.downloadFileName = parts[parts.length - 1];
      }
    });
  }

  prepareDownload(projectId: string) {
    if (this.settingModals.projectExport.downloadPrepareMessage == DownloadState.PREPARATION || this.settingModals.projectExport.downloadPrepareMessage == DownloadState.DOWNLOAD) return;
    this.settingModals.projectExport.downloadPrepareMessage = DownloadState.PREPARATION;
    const exportOptions = this.buildJsonExportOptions();
    this.projectApolloService.prepareProjectExport(projectId, exportOptions).pipe(first()).subscribe();
    this.settingModals.projectExport.projectExportCredentials = null;
  }

  exportViaFile(isText: boolean) {
    if (!this.settingModals.projectExport.projectExportCredentials) return;
    this.settingModals.projectExport.downloadPrepareMessage = DownloadState.DOWNLOAD;
    const fileName = this.settingModals.projectExport.projectExportCredentials.downloadFileName;
    this.s3Service.downloadFile(this.settingModals.projectExport.projectExportCredentials, isText).subscribe((data) => {
      if (isText) downloadText(fileName, data);
      else downloadBlob(data, fileName);
      timer(5000).subscribe(
        () => (this.settingModals.projectExport.downloadPrepareMessage = DownloadState.NONE)
      );
    });
  }

  requestFileExport(projectId: string): void {
    this.downloadMessage = DownloadState.PREPARATION;
    this.projectApolloService.exportRecords(projectId).subscribe((e) => {
      this.downloadMessage = DownloadState.DOWNLOAD;
      const downloadContent = JSON.parse(e);
      downloadText('export.json', downloadContent);
      const timerTime = Math.max(2000, e.length * 0.0001);
      timer(timerTime).subscribe(
        () => (this.downloadMessage = DownloadState.NONE)
      );
    });
  }

  requestProjectSize() {
    this.settingModals.projectExport.projectSize = null;
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
      this.settingModals.projectExport.downloadSizeText = formatBytes(downloadSize, 2);
    } else {
      this.settingModals.projectExport.downloadSizeText = "0 bytes";
    }
  }

  prepareProjectDownload(projectId: string) {
    this.projectApolloService.getProjectSize(projectId).pipe(first()).subscribe((size) => {
      this.settingModals.projectExport.projectSize = size;
      size.forEach((element) => {
        let group = this.formBuilder.group({
          export: element.default,
          moveRight: getMoveRight(element.table),
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

  createUserAttribute() {
    if (this.settingModals.attribute.duplicateNameExists) return;

    const attributeType = this.dataTypesArray.find((type) => type.name === this.settingModals.attribute.type).value;
    this.projectApolloService
      .createUserAttribute(this.project.id, this.settingModals.attribute.name, attributeType)
      .pipe(first())
      .subscribe((res) => {
        const id = res?.data?.createUserAttribute.attributeId;
        if (id) {
          localStorage.setItem("isNewAttribute", "X");
          this.router.navigate(['../attributes/' + id],
            {
              relativeTo: this.activatedRoute
            });
        }
      });
  }
  updateDataType(dataType: string) {
    this.settingModals.attribute.type = dataType;
  }

  changeAttributeName(event: any) {
    this.settingModals.attribute.name = toPythonFunctionName(event.target.value);
    const findDuplicate = this.attributes.find(att => att.name == event.target.value);
    this.settingModals.attribute.duplicateNameExists = findDuplicate != undefined ? true : false;
  }

  openModalAttribute() {
    this.settingModals.attribute.open = true;
    this.settingModals.attribute.name = findFreeAttributeName(this.attributes);
    this.dataHandlerHelper.focusModalInputBox('attributeName');
  }

  checkIfAcIsRunning() {
    return this.attributes.some(a => a.state == AttributeCalculationState.RUNNING) || this.checkIfAcUploadedRecords;
  }
}
