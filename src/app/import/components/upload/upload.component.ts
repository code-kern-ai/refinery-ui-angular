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
import { UploadHelper } from './upload-helper';
import { RecordAddUploadHelper, RecordNewUploadHelper } from './upload-specific';
import { UploadFileType, UploadOptions, UploadTask, UploadType } from './upload-types';

@Component({
  selector: 'kern-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {


  @Input() uploadFileType: UploadFileType;
  @Input() projectId?: string;
  @Input() uploadOptions: UploadOptions;

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  uploadHelper: UploadHelper;
  recordNewUploadHelper: RecordNewUploadHelper;
  recordAddUploadHelper: RecordAddUploadHelper;
  file: File | null = null;
  @ViewChild('importOptions', { read: ElementRef }) importOptionsHTML: ElementRef;


  // @Input() deleteProjectOnFail: boolean;
  uploadStarted: boolean = false;
  uploadTask: UploadTask;
  uploadTaskQuery$: any;
  // reloadOnFinish: boolean = true;
  // uploadFileType: UploadFileType;
  @Output() fileAttached = new EventEmitter<File>();
  get UploadStatesType(): typeof UploadStates {
    return UploadStates;
  }

  @ViewChild('fileUpload') fileUpload: ElementRef;
  selectedTokenizer: string = "en_core_web_sm";
  executeOnFinish: () => void;
  uploadType: UploadType = UploadType.DEFAULT;
  uploadTask$;
  upload$: Observable<UploadState>;

  constructor(private projectApolloService: ProjectApolloService, private router: Router, private s3Service: S3Service) {
    this.recordNewUploadHelper = new RecordNewUploadHelper(this.projectApolloService, this.router);
    this.recordAddUploadHelper = new RecordAddUploadHelper();
    this.uploadHelper = new UploadHelper(this.router, this, this.recordNewUploadHelper, this.recordAddUploadHelper);
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
    let tasks$ = [];
    tasks$.push(this.projectApolloService.changeProjectTokenizer(projectId, this.selectedTokenizer));
    tasks$.push(this.projectApolloService.updateProjectStatus(projectId, ProjectStatus.INIT_COMPLETE));
    forkJoin(tasks$).pipe(first()).subscribe();
  }

  finishUpUpload(filename: string, importOptions: string) {
    this.projectApolloService
      .getUploadCredentialsAndId(this.projectId, filename, this.uploadFileType, importOptions, this.uploadType)
      .pipe(first()).subscribe((results) => {
        this.uploadFile(results, filename)
      });
  }

  uploadFile(uploadInformation: any, filename: string) {
    this.uploadStarted = true;
    const credentialsAndUploadId = JSON.parse(JSON.parse(uploadInformation))
    this.startProgressCall(credentialsAndUploadId.uploadTaskId).subscribe(() => {
      this.upload$ = this.s3Service.uploadFile(credentialsAndUploadId, this.file, filename).pipe(
        tap((progress) => {
          if (progress.state === UploadStates.DONE || progress.state === UploadStates.ERROR) {
            timer(500).subscribe(() => this.file = null);
            if (progress.state === UploadStates.ERROR && this.uploadOptions.deleteProjectOnFail) {
              this.deleteExistingProject();
            }
          }
        })
      )
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
    this.upload$ = null;
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
    this.uploadHelper.upload();
  }

  changeProjectTitle(event: any) {
    this.recordNewUploadHelper.projectTitle = event.target.value;
  }

  changeProjectDescription(event: any) {
    this.recordNewUploadHelper.description = event.target.value;
  }

}
