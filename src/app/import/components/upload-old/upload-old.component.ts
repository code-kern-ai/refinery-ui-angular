import { HttpClient } from '@angular/common/http';
import { S3Service } from '../../services/s3.service';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { forkJoin, interval, Observable, Subscription, timer } from 'rxjs';
import { UploadState } from 'src/app/base/entities/upload-state';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { first, tap } from 'rxjs/operators';
import { RecordCategory } from 'src/app/base/enum/graphql-enums';
import { UploadStates } from '../../services/s3.enums';
import { Router } from '@angular/router';
import { ProjectStatus } from 'src/app/projects/enums/project-status.enum';
import { NotificationService } from 'src/app/base/services/notification.service';
import { UploadType } from '../upload/upload-types';


@Component({
  selector: 'kern-upload-old',
  templateUrl: './upload-old.component.html',
  styleUrls: ['./upload-old.component.scss'],
})
export class UploadOldComponent implements OnDestroy, OnInit, AfterViewInit {
  @Input() projectId: string;
  @Input() reloadOnFinish: boolean = true;
  @Input() unique;
  @Input() init = false;
  @Input() deleteProjectOnFail = false;
  file: File | null = null;
  @Output() fileAttached = new EventEmitter<File>();

  get UploadStatesType(): typeof UploadStates {
    return UploadStates;
  }
  upload$: Observable<UploadState>;
  uploadTask$;
  uploadTaskQuery$;
  uploadTask;
  uploadStarted: boolean = false;
  uploadFileType = new FormControl('records');
  uploadRecordType = new FormControl(RecordCategory.SCALE);
  uploadType: UploadType = UploadType.DEFAULT;

  uploadFileTypes = ['records', 'embeddings', 'labels'];
  uploadRecordsTypes = [RecordCategory.SCALE, RecordCategory.TEST];
  executeOnFinish: () => void;
  @ViewChild('fileInput') fileInput;
  showFileBox: boolean = true;
  @ViewChild('noFileUploaded', { read: ElementRef }) noFileUploaded: ElementRef;
  @ViewChild('fileUploaded', { read: ElementRef }) fileUploaded: ElementRef;

  constructor(
    private projectApolloService: ProjectApolloService,
    private s3Service: S3Service,
  ) { }
  ngOnInit(): void {
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
    if (this.init) this.uploadFileType.setValue("project");
    else {
      this.projectApolloService.getUploadTasksByProjectId(this.projectId)
        .pipe(first()).subscribe((uploadTasks) => {
          for (const t of uploadTasks) {
            if (t.state == UploadStates.IN_PROGRESS || t.state == UploadStates.WAITING || t.state == UploadStates.PENDING) {
              this.uploadStarted = true;
              this.startProgressCall(t.id);
              return;
            }
          }
        });
    }
  }

  ngAfterViewInit(): void {
    this.noFileUploaded.nativeElement.classList.add('block');
  }

  reSubscribeToNotifications() {

    NotificationService.unsubscribeFromNotification(this, null);
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });

  }

  onFileInput(files: FileList | null): void {
    if (files) {
      this.file = files.item(0);
      this.fileAttached.emit(this.file);
      this.fileInput.nativeElement.value = '';
    }
  }

  onSubmit(importOptions: string) {
    if (this.file) {
      let filename = this.file.name
      if (this.uploadFileType.value == 'records') {
        filename = this.getFinalFileName(filename);
      }
      let tasks$ = [];
      if (this.init && this.projectId == null) tasks$.push(this.createEmptyProject());

      if (tasks$.length != 0) {
        //wait project creation
        forkJoin([...tasks$])
          .pipe(first())
          .subscribe((results: any) => {
            this.projectId = results[0].id;
            this.prepareEmptyProject();
            this.finishUpUpload(filename, importOptions);
          });
      } else {
        this.finishUpUpload(filename, importOptions);
      }
    }
  }

  finishUpUpload(filename, importOptions) {
    let tasks$ = [];
    tasks$.push(this.getUploadCredentialsAndId(filename, importOptions));

    forkJoin([...tasks$])
      .pipe(first())
      .subscribe((results) => {
        this.uploadFile(results[0], filename)
      });
  }

  prepareEmptyProject() {
    this.projectApolloService
      .changeProjectTokenizer(this.projectId, 'en_core_web_sm')
      .pipe(first()).subscribe();
    this.projectApolloService
      .updateProjectStatus(
        this.projectId,
        ProjectStatus.INIT_COMPLETE
      ).pipe(first()).subscribe();
  }

  createEmptyProject() {

    return this.projectApolloService
      .createProject("Imported Project", "Created during file upload " + this.file.name).pipe(first());
  }

  uploadFile(uploadInformation, filename: string) {
    this.uploadStarted = true;
    const credentialsAndUploadId = JSON.parse(JSON.parse(uploadInformation))
    forkJoin(this.startProgressCall(credentialsAndUploadId.uploadTaskId)).subscribe(() => {
      this.upload$ = this.s3Service.uploadFile(credentialsAndUploadId, this.file, filename).pipe(
        tap((progress) => {
          if (progress.state === UploadStates.DONE || progress.state === UploadStates.ERROR) {
            timer(500).subscribe(() => this.file = null);
            if (this.init && progress.state === UploadStates.ERROR && this.deleteProjectOnFail) {
              //create created project if not successful -- only s3 upload errors not general import errors
              this.deleteExistingProject();
            }
          }
        })
      )
    })
  }

  deleteExistingProject() {
    this.projectApolloService.deleteProjectById(this.projectId).pipe(first()).subscribe();
  }

  startProgressCall(uploadTaskId: string) {
    [this.uploadTaskQuery$, this.uploadTask$] = this.projectApolloService.getUploadTaskByTaskId(this.projectId, uploadTaskId);
    const firstReturn = this.uploadTask$.pipe(first());
    this.uploadTask$ = this.uploadTask$.subscribe((task) => {
      this.uploadTask = task;
      this.fileUploaded.nativeElement.classList.add('hidden');
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

  identifiableRecords(uploadFileType) {
    return uploadFileType == "records" || this.unique || uploadFileType == "project";
  }

  ngOnDestroy() {
    if (this.uploadTask$) this.uploadTask$.unsubscribe();
    NotificationService.unsubscribeFromNotification(this, this.projectId)
  }


  getUploadCredentialsAndId(filename: string, fileImportOptions: string) {
    return this.projectApolloService
      .getUploadCredentialsAndId(
        this.projectId,
        filename,
        this.uploadFileType.value,
        fileImportOptions,
        this.uploadType
      ).pipe(first());
  }

  handleWebsocketNotification(msgParts) {
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

  getFinalFileName(fileName: string): string {
    return fileName + "_" + this.uploadRecordType.value;
  }

  getLookupListName(fileName: string, listId: string): string {
    return fileName + "_" + listId;
  }

  removeFile(event) {
    event.stopPropagation();
    this.file = null;
    this.fileAttached.emit(null);
  }

  onFileDropped(files) {
    this.file = files[0];
    this.fileAttached.emit(this.file);
  }

  resetUpload() {
    this.file = null;
    this.clearUploadTask();
    this.upload$ = null;
    this.uploadStarted = false;
    this.fileAttached.emit(null);
  }
}
