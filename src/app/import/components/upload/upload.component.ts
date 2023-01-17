import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Observable, timer } from 'rxjs';
import { first, tap } from 'rxjs/operators';
import { UploadState } from 'src/app/base/entities/upload-state';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { ProjectStatus } from 'src/app/projects/enums/project-status.enum';
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
export class UploadComponent implements OnInit {

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
  selectedTokenizer: string = "en_core_web_sm";
  executeOnFinish: () => void;
  uploadType: UploadType = UploadType.DEFAULT;
  uploadTask$;
  progressState: UploadState;
  isProjectTitleEmpty: boolean = false;
  isProjectTitleDuplicate: boolean = false;
  submitted: boolean = false;

  constructor(private projectApolloService: ProjectApolloService, private router: Router, private s3Service: S3Service) {
    this.recordNewUploadHelper = new RecordNewUploadHelper(this.projectApolloService, this.router, this);
    this.recordAddUploadHelper = new RecordAddUploadHelper(this.router, this);
    this.existingProjectUploadHelper = new ExistingProjectUploadHelper(this.projectApolloService, this.router, this);
    this.lookupListsUploadHelper = new LookupListsUploadHelper(this.router, this)
    this.uploadHelper = new UploadHelper(this.router, this, this.recordNewUploadHelper, this.recordAddUploadHelper, this.existingProjectUploadHelper, this.lookupListsUploadHelper);
  }

  ngOnInit(): void {
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
  }

  ngOnDestroy() {
    if (this.uploadTask$) this.uploadTask$.unsubscribe();
    NotificationService.unsubscribeFromNotification(this, this.projectId)
  }

  onFileDropped(files: File[]) {
    this.file = files.length > 0 ? files[0] : null;
    this.fileAttached.emit(this.file);
  }

  onFileInput(event: any) {
    event.stopPropagation();
    this.onFileDropped(event.target.files);
    this.fileUpload.nativeElement.value = '';
  }

  onFileRemove(event: Event) {
    event.stopPropagation();
    this.onFileDropped([]);
    this.fileUpload.nativeElement.value = '';
  }

  createProject() {
    return this.projectApolloService
      .createProject("Imported Project", "Created during file upload " + this.file.name).pipe(first());
  }

  updateTokenizerAndProjectStatus(projectId: string) {
    this.projectApolloService.changeProjectTokenizer(projectId, this.selectedTokenizer).pipe(first()).subscribe();
    this.projectApolloService.updateProjectStatus(projectId, ProjectStatus.INIT_COMPLETE).pipe(first()).subscribe();
  }

  finishUpUpload(filename: string, importOptions: string) {
    this.projectApolloService
      .getUploadCredentialsAndId(this.projectId, filename, this.uploadFileType, importOptions, this.uploadType)
      .pipe(first()).subscribe((results) => {
        this.uploadFileToMinIO(results, filename)
      });
  }

  uploadFileToMinIO(uploadInformation: any, filename: string) {
    this.uploadStarted = true;
    const credentialsAndUploadId = JSON.parse(JSON.parse(uploadInformation))
    this.startProgressCall(credentialsAndUploadId.uploadTaskId).subscribe(() => {
      this.s3Service.uploadFile(credentialsAndUploadId, this.file, filename).subscribe((progress) => {
        this.progressState = progress;
        if (this.progressState.state === UploadStates.DONE || this.progressState.state === UploadStates.ERROR) {
          timer(500).subscribe(() => this.file = null);
          if (this.progressState.state === UploadStates.ERROR && this.uploadOptions.deleteProjectOnFail) {
            this.deleteExistingProject();
          }
        }
      });
    })
  }

  startProgressCall(uploadTaskId: string) {
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

  clearUploadTask() {
    this.uploadTask$.unsubscribe();
    this.uploadTask$ = null;
    this.uploadTask = null;
    this.uploadTaskQuery$ = null;
  }

  deleteExistingProject() {
    this.projectApolloService.deleteProjectById(this.projectId).pipe(first()).subscribe();
  }

  resetUpload() {
    this.file = null;
    this.clearUploadTask();
    this.uploadStarted = false;
    this.fileAttached.emit(null);
  }

  reSubscribeToNotifications() {
    NotificationService.unsubscribeFromNotification(this, null);
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
  }

  handleWebsocketNotification(msgParts: string[]) {
    if (!this.uploadTask || !this.uploadTaskQuery$) return;
    if (msgParts[2] != this.uploadTask.id) return;
    if (msgParts[3] == 'state') {
      if (msgParts[4] == UploadStates.DONE) this.uploadTaskQuery$.refetch();
      else if (msgParts[4] == UploadStates.ERROR) {
        this.resetUpload();
        if (this.uploadOptions.deleteProjectOnFail) this.deleteExistingProject();
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

  submitUploadFile() {
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

  changeProjectTitle(event: any) {
    this.recordNewUploadHelper.projectTitle = event.target.value;
  }

  changeProjectDescription(event: any) {
    this.recordNewUploadHelper.description = event.target.value;
  }

  toggleTab(tabNum: number) {
    this.openTab = tabNum;
  }

  initProjectEvent(event: Event) {
    event.preventDefault();
    this.submitUploadFile();
  }

  checkIfProjectTitleExist() {
    const findProjectName = this.uploadOptions.projectNameList.find(project => project.name === this.recordNewUploadHelper.projectTitle);
    return findProjectName != undefined ? true : false;
  }

}
