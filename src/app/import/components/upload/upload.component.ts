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
import { UploadFileType, UploadType } from './upload-helper';

@Component({
  selector: 'kern-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {

  @Input() file: File | null = null;
  @Input() projectId: string;
  @Input() deleteProjectOnFail: boolean;
  uploadStarted: boolean = false;
  uploadTask: UploadTask;
  uploadTaskQuery$: any;
  reloadOnFinish: boolean = true;
  uploadFileType: UploadFileType;
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

  constructor(private projectApolloService: ProjectApolloService, private router: Router, private s3Service: S3Service) { }

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

  uploadFileToMinio(projectId: string, uploadFileType: UploadFileType, knowledgeBaseId?: string): string {
    this.projectId = projectId;
    this.reloadOnFinish = UploadFileType.RECORDS || uploadFileType == UploadFileType.KNOWLEDGE_BASE ? false : true;
    this.uploadStarted = true;
    this.reSubscribeToNotifications();
    this.uploadFileType = uploadFileType;
    this.executeOnFinish = () => {
      timer(200).subscribe(() => {
        this.router.navigate(['projects', this.projectId, 'settings'])
      });
    }
    return this.getFinalFileName(this.file?.name, knowledgeBaseId);
  }

  getFinalFileName(fileName: string, knowledgeBaseId?: string): string {
    switch (this.uploadFileType) {
      case UploadFileType.RECORDS:
        return fileName + "_SCALE";
      case UploadFileType.KNOWLEDGE_BASE:
        return fileName + "_" + knowledgeBaseId;
      default:
        return fileName;
    }
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
            if (progress.state === UploadStates.ERROR && this.deleteProjectOnFail) {
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
        if (this.reloadOnFinish) location.reload();
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
        if (this.deleteProjectOnFail) this.deleteExistingProject();
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

}

export type UploadTask = {
  fileAdditionalInfo: string;
  id: string;
  progress: number;
  state: string;
  userId: string;
};