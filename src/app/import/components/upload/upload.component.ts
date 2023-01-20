import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { PreparationStep } from 'src/app/base/components/upload-assistant/label-studio/label-studio-assistant-helper';
import { LabelStudioAssistantComponent } from 'src/app/base/components/upload-assistant/label-studio/label-studio-assistant.component';
import { UploadState } from 'src/app/base/entities/upload-state';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { UploadStates } from '../../services/s3.enums';
import { S3Service } from '../../services/s3.service';
import { UploadHelper } from '../helpers/upload-helper';
import { ExistingProjectUploadHelper, LookupListsUploadHelper, RecordAddUploadHelper, RecordNewUploadHelper } from '../helpers/upload-specific';
import { UploadFileType, UploadOptions, UploadTask, UploadType } from '../helpers/upload-types';

@Component({
  selector: 'kern-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit, OnChanges, OnDestroy {

  @Input() uploadFileType: UploadFileType;
  @Input() projectId?: string;
  @Input() uploadOptions: UploadOptions;

  @Output() fileAttached = new EventEmitter<File>();

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  get UploadStatesType(): typeof UploadStates {
    return UploadStates;
  }

  @ViewChild('importOptions', { read: ElementRef }) importOptionsHTML: ElementRef;
  @ViewChild('fileUpload') fileUpload: ElementRef;
  @ViewChild(LabelStudioAssistantComponent) labelStudioUploadAssistant;
  uploadHelper: UploadHelper;
  recordNewUploadHelper: RecordNewUploadHelper;
  recordAddUploadHelper: RecordAddUploadHelper;
  existingProjectUploadHelper: ExistingProjectUploadHelper;
  lookupListsUploadHelper: LookupListsUploadHelper;
  file: File | null = null;
  openTab: number = 0;
  uploadStarted: boolean = false;
  uploadTask: UploadTask;
  uploadTaskQuery$: any;
  executeOnFinish: () => void;
  uploadType: UploadType = UploadType.DEFAULT;
  uploadTask$;
  progressState: UploadState;
  isProjectTitleEmpty: boolean = false;
  isProjectTitleDuplicate: boolean = false;
  submitted: boolean = false;
  disableInput: boolean = false;
  tokenizerValuesDisabled: boolean[] = [];

  constructor(private projectApolloService: ProjectApolloService, private router: Router, private s3Service: S3Service) {
    this.recordNewUploadHelper = new RecordNewUploadHelper(this.projectApolloService, this);
    this.recordAddUploadHelper = new RecordAddUploadHelper(this);
    this.existingProjectUploadHelper = new ExistingProjectUploadHelper(this.projectApolloService, this);
    this.lookupListsUploadHelper = new LookupListsUploadHelper(this)
    this.uploadHelper = new UploadHelper(this, this.projectApolloService);
  }

  ngOnInit(): void {
    this.recordAddUploadHelper.projectName = this.uploadOptions.projectName;
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
    if (this.uploadType == UploadType.LABEL_STUDIO) {
      if (this.labelStudioUploadAssistant?.states.preparation != PreparationStep.MAPPING_TRANSFERRED) {
        this.deleteExistingProject();
        this.submitted = false;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.uploadOptions) {
      this.recordAddUploadHelper.projectName = this.uploadOptions.projectName;
      const tokenizerValuesDisplay = [];
      this.uploadOptions.tokenizerValues?.forEach((tokenizer: any, index: number) => {
        const tokenizerNameContainsBrackets = tokenizer.name.includes('(') && tokenizer.name.includes(')');
        tokenizer.name = tokenizer.name + (tokenizer.configString != undefined && !tokenizerNameContainsBrackets ? ` (${tokenizer.configString})` : '');
        tokenizerValuesDisplay[index] = tokenizer;
        this.tokenizerValuesDisabled[index] = tokenizer.disabled;
      });
      this.uploadOptions.tokenizerValues = tokenizerValuesDisplay;
    }
  }

  ngOnDestroy(): void {
    if (this.uploadTask$) this.uploadTask$.unsubscribe();
    NotificationService.unsubscribeFromNotification(this, this.projectId)
  }

  onFileDropped(files: File[]): void {
    this.file = files.length > 0 ? files[0] : null;
    this.fileAttached.emit(this.file);
  }

  onFileInput(event: any): void {
    event.stopPropagation();
    this.onFileDropped(event.target.files);
    this.fileUpload.nativeElement.value = '';
  }

  onFileRemove(event: Event): void {
    event.stopPropagation();
    this.onFileDropped([]);
    this.fileUpload.nativeElement.value = '';
  }

  finishUpUpload(filename: string, importOptions: string): void {
    this.projectApolloService
      .getUploadCredentialsAndId(this.projectId, filename, this.uploadFileType, importOptions, this.uploadType)
      .pipe(first()).subscribe((results) => {
        this.uploadFileToMinIO(results, filename)
      });
  }

  uploadFileToMinIO(uploadInformation: any, filename: string): void {
    this.uploadStarted = true;
    const credentialsAndUploadId = JSON.parse(JSON.parse(uploadInformation))
    this.startProgressCall(credentialsAndUploadId.uploadTaskId).subscribe(() => {
      this.s3Service.uploadFile(credentialsAndUploadId, this.file, filename).subscribe((progress) => {
        this.progressState = progress;
        if (this.progressState.state === UploadStates.DONE || this.progressState.state === UploadStates.ERROR) {
          timer(500).subscribe(() => {
            this.file = null;
            this.submitted = false;
          });
          if (this.progressState.state === UploadStates.ERROR && this.uploadOptions.deleteProjectOnFail) {
            this.deleteExistingProject();
            this.submitted = false;
          }
        }
      });
    })
  }

  startProgressCall(uploadTaskId: string): any {
    [this.uploadTaskQuery$, this.uploadTask$] = this.projectApolloService.getUploadTaskByTaskId(this.projectId, uploadTaskId);
    const firstReturn = this.uploadTask$.pipe(first());
    this.uploadTask$ = this.uploadTask$.subscribe((task) => {
      this.uploadTask = task;
      if (task.state == UploadStates.DONE || task.progress == 100) {
        this.clearUploadTask();
        if (this.uploadOptions.reloadOnFinish) location.reload();
        else this.uploadStarted = false;
        if (this.executeOnFinish) {
          this.executeOnFinish.call(this);
        }
      }
    });
    return firstReturn;
  }

  clearUploadTask(): void {
    this.uploadTask$.unsubscribe();
    this.uploadTask$ = null;
    this.uploadTask = null;
    this.uploadTaskQuery$ = null;
    this.progressState = null;
  }

  deleteExistingProject(): void {
    this.projectApolloService.deleteProjectById(this.projectId).pipe(first()).subscribe();
  }

  resetUpload(): void {
    this.file = null;
    this.clearUploadTask();
    this.uploadStarted = false;
    this.fileAttached.emit(null);
  }

  reSubscribeToNotifications(): void {
    NotificationService.unsubscribeFromNotification(this, null);
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
  }

  handleWebsocketNotification(msgParts: string[]): void {
    if (!this.uploadTask || !this.uploadTaskQuery$) return;
    if (msgParts[2] != this.uploadTask.id) return;
    if (msgParts[3] == 'state') {
      if (msgParts[4] == UploadStates.DONE) this.uploadTaskQuery$.refetch();
      else if (msgParts[4] == UploadStates.ERROR) {
        this.resetUpload();
        if (this.uploadOptions.deleteProjectOnFail) {
          this.deleteExistingProject();
          this.submitted = false;
        }
      }
      else {
        this.uploadTask = { ...this.uploadTask };
        this.uploadTask.state = UploadStates[msgParts[4]]
      };
    }
    else if (msgParts[3] == 'progress') {
      if (msgParts[4] == "100") this.uploadTaskQuery$.refetch();
      else this.uploadTask.progress = Number(msgParts[4]);
    }
    else {
      console.log("unknown websocket message in part 3:" + msgParts[3], "full message:", msgParts)
    }
  }

  submitUploadFile(uploadType: UploadType = UploadType.DEFAULT): void {
    this.uploadType = uploadType;
    this.submitted = true;
    if (this.file == null) return;

    if (this.uploadFileType == UploadFileType.RECORDS_NEW) {
      if (this.recordNewUploadHelper.projectTitle == '') {
        this.isProjectTitleEmpty = true;
        return;
      }

      if (this.checkIfProjectTitleExist()) {
        this.isProjectTitleDuplicate = true;
        return;
      }
    }
    this.uploadHelper.upload();
  }

  changeProjectTitle(event: any): void {
    this.recordNewUploadHelper.projectTitle = event.target.value;
    this.isProjectTitleDuplicate = this.checkIfProjectTitleExist();
    this.isProjectTitleEmpty = this.recordNewUploadHelper.projectTitle == '' ? true : false;
  }

  changeProjectDescription(event: any): void {
    this.recordNewUploadHelper.description = event.target.value;
  }

  toggleTab(tabNum: number): void {
    this.openTab = tabNum;
  }

  initProjectEvent(event: Event): void {
    event.preventDefault();
    this.submitUploadFile();
  }

  checkIfProjectTitleExist(): boolean {
    const findProjectName = this.uploadOptions.projectNameList.find(project => project.name === this.recordNewUploadHelper.projectTitle);
    return findProjectName != undefined ? true : false;
  }

  navigateToSettings(): void {
    timer(200).subscribe(() => {
      this.router.navigate(['projects', this.projectId, 'settings'])
    });
  }

  setTokenizer(tokenizer: string): void {
    const findName: any = this.uploadOptions.tokenizerValues.find((tok: any) => tok.configString === tokenizer);
    this.recordNewUploadHelper.selectedTokenizer = findName.name;
  }

}
