import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { createDefaultModalUploadModal, UploadModals } from './modal-upload-helper';
import { UploadFileType, UploadOptions } from '../helpers/upload-types';
import { UploadComponent } from '../upload/upload.component';
import { UploadHelper } from '../helpers/upload-helper';
import { Router } from '@angular/router';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { S3Service } from '../../services/s3.service';
import { UploadStates } from '../../services/s3.enums';

@Component({
  selector: 'kern-modal-upload',
  templateUrl: './modal-upload.component.html',
  styleUrls: ['./modal-upload.component.scss']
})
export class ModalUploadComponent implements OnChanges {

  @Input() uploadFileType: UploadFileType;
  @Input() isModalOpen: boolean;
  @Input() uploadOptions: UploadOptions;
  @Input() projectId?: string;

  @Output() closeModalEvent = new EventEmitter();
  @Output() fileAttached = new EventEmitter<File>();

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  get UploadStatesType(): typeof UploadStates {
    return UploadStates;
  }

  @ViewChild('fileUpload') fileUpload: ElementRef;
  uploadModals: UploadModals = createDefaultModalUploadModal();
  file: File | null = null;
  uploadHelper: UploadHelper;
  baseComponent: UploadComponent;
  title: string;
  subTitle: string;

  constructor(private projectApolloService: ProjectApolloService, private router: Router, private s3Service: S3Service) {
    this.baseComponent = new UploadComponent(this.projectApolloService, this.router, this.s3Service);
    this.uploadHelper = new UploadHelper(router, this.baseComponent, this.baseComponent.recordNewUploadHelper, this.baseComponent.recordAddUploadHelper, this.baseComponent.existingProjectUploadHelper, this.baseComponent.lookupListsUploadHelper);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isModalOpen) {
      this.uploadModals.uploadFile.open = changes.isModalOpen.currentValue;
      this.title = this.getTitle();
      this.subTitle = this.getSubtitle();
    }
  }

  closeModal(): void {
    this.uploadModals.uploadFile.open = false;
    this.closeModalEvent.emit();
  }

  submitUpload() {
    this.baseComponent.uploadFileType = this.uploadFileType;
    this.baseComponent.uploadOptions = this.uploadOptions;
    if (this.projectId) this.baseComponent.projectId = this.projectId;
    this.uploadModals.uploadFile.doingSomething = true;
    this.uploadHelper.upload(this.file);
  }

  setFile(file: File): void {
    this.file = file;
  }

  getTitle(): string {
    switch (this.uploadFileType) {
      case UploadFileType.PROJECT:
        return 'Upload Project Data';
      case UploadFileType.KNOWLEDGE_BASE:
        return 'Upload List Data';
      default:
        return 'Upload File';
    }
  }

  getSubtitle(): string {
    switch (this.uploadFileType) {
      case UploadFileType.PROJECT:
        return 'Upload data from an existing project';
      case UploadFileType.KNOWLEDGE_BASE:
        return 'Upload data to your lookup list';
      default:
        return 'Upload a file';
    }
  }
}
