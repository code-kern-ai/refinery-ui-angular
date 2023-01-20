import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { createDefaultModalUploadModal, getSubtitle, getTitle, UploadModals } from './modal-upload-helper';
import { UploadFileType, UploadOptions } from '../helpers/upload-types';
import { UploadComponent } from '../upload/upload.component';
import { UploadStates } from '../../services/s3.enums';
import { interval } from 'rxjs';
import { NotificationService } from 'src/app/base/services/notification.service';

@Component({
  selector: 'kern-modal-upload',
  templateUrl: './modal-upload.component.html',
  styleUrls: ['./modal-upload.component.scss']
})
export class ModalUploadComponent implements OnInit, OnChanges, OnDestroy {

  @Input() uploadFileType: UploadFileType;
  @Input() isModalOpen: boolean;
  @Input() uploadOptions: UploadOptions;
  @Input() projectId: string;

  @Output() closeModalEvent = new EventEmitter();
  @Output() fileAttached = new EventEmitter<File>();
  @Output() refetchLookupLists = new EventEmitter<boolean>();

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  get UploadStatesType(): typeof UploadStates {
    return UploadStates;
  }

  @ViewChild('fileUpload') fileUpload: ElementRef;
  @ViewChild(UploadComponent) baseComponent: UploadComponent;
  uploadModals: UploadModals = createDefaultModalUploadModal();
  file: File | null = null;
  title: string;
  subTitle: string;

  constructor() { }

  ngOnInit(): void {
    this.title = getTitle(this.uploadFileType);
    this.subTitle = getSubtitle(this.uploadFileType);

    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
  }

  ngOnDestroy(): void {
    NotificationService.unsubscribeFromNotification(this, this.projectId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isModalOpen) {
      this.uploadModals.uploadFile.open = changes.isModalOpen.currentValue;
    }
  }

  closeModal(): void {
    this.uploadModals.uploadFile.open = false;
    if (this.uploadOptions.closeModalOnClick) {
      this.closeModalEvent.emit();
    }
    if (this.uploadOptions.knowledgeBaseId) {
      this.refetchLookupLists.emit(true);
    }
  }

  submitUpload(): void {
    this.baseComponent.uploadFileType = this.uploadFileType;
    this.baseComponent.uploadOptions = this.uploadOptions;
    if (this.projectId) this.baseComponent.projectId = this.projectId;
    this.uploadModals.uploadFile.doingSomething = true;
    this.baseComponent.uploadHelper.upload(this.file);
  }

  setFile(file: File): void {
    this.file = file;
  }

  optionClicked(button: string): void {
    if (button == 'CLOSE') this.closeModal();
    else if (button == 'ACCEPT') {
      const x = interval(1000).subscribe(() => {
        if (this.baseComponent.progressState?.progress === 100 && this.baseComponent.progressState?.state === UploadStates.DONE) {
          this.baseComponent.resetUpload();
          this.uploadModals.uploadFile.doingSomething = false;
          this.closeModal();
          x.unsubscribe();
        }
      });
    }
  }

  handleWebsocketNotification(msgParts: string[]): void {
    if (msgParts[1] === 'file_upload' && msgParts[4] === UploadStates.ERROR) {
      if (this.uploadOptions.deleteProjectOnFail) this.baseComponent.deleteExistingProject();
    }
  }
}
