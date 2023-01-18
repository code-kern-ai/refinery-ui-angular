import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { createDefaultModalUploadModal, getSubtitle, getTitle, UploadModals } from './modal-upload-helper';
import { UploadFileType, UploadOptions } from '../helpers/upload-types';
import { UploadComponent } from '../upload/upload.component';
import { UploadHelper } from '../helpers/upload-helper';
import { UploadStates } from '../../services/s3.enums';
import { interval } from 'rxjs';
import { NotificationService } from 'src/app/base/services/notification.service';

@Component({
  selector: 'kern-modal-upload',
  templateUrl: './modal-upload.component.html',
  styleUrls: ['./modal-upload.component.scss']
})
export class ModalUploadComponent implements OnInit, AfterViewInit, OnChanges {

  @Input() uploadFileType: UploadFileType;
  @Input() isModalOpen: boolean;
  @Input() uploadOptions: UploadOptions;
  @Input() projectId?: string;

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
  uploadHelper: UploadHelper;
  title: string;
  subTitle: string;

  constructor() { }

  ngOnInit(): void {
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
  }

  ngAfterViewInit(): void {
    this.uploadHelper = new UploadHelper(this.baseComponent, this.baseComponent.recordNewUploadHelper, this.baseComponent.recordAddUploadHelper, this.baseComponent.existingProjectUploadHelper, this.baseComponent.lookupListsUploadHelper);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isModalOpen) {
      this.uploadModals.uploadFile.open = changes.isModalOpen.currentValue;
      this.title = getTitle(this.uploadFileType);
      this.subTitle = getSubtitle(this.uploadFileType);
    }
  }

  closeModal(): void {
    this.uploadModals.uploadFile.open = false;
    this.closeModalEvent.emit();
    if (this.uploadOptions.knowledgeBaseId) {
      this.refetchLookupLists.emit(true);
    }
  }

  submitUpload(): void {
    this.baseComponent.uploadFileType = this.uploadFileType;
    this.baseComponent.uploadOptions = this.uploadOptions;
    if (this.projectId) this.baseComponent.projectId = this.projectId;
    this.uploadModals.uploadFile.doingSomething = true;
    this.uploadHelper.upload(this.file);
  }

  setFile(file: File): void {
    this.file = file;
  }

  optionClicked(button: string): void {
    if (button == 'CLOSE') this.closeModal();
    if (button == 'ACCEPT') {
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
      this.baseComponent.deleteExistingProject();
    }
  }
}
