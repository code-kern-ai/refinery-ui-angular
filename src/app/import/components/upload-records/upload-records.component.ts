import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { timer } from 'rxjs';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { ProjectStatus } from 'src/app/projects/enums/project-status.enum';
import { UploadComponent } from 'src/app/import/components/upload/upload.component';
import { first } from 'rxjs/operators';
import { UploadFileType } from '../upload/upload-types';

@Component({
  selector: 'kern-upload-records',
  templateUrl: './upload-records.component.html',
  styleUrls: ['./upload-records.component.scss']
})
export class UploadRecordsComponent implements OnInit {
  @Input() projectId: string;
  @Input() selectedTokenizer: string;
  @Input() submitted: boolean;
  @Input() deleteProjectOnFail: boolean = false;
  @Output() hasFileUploaded = new EventEmitter<boolean>();

  file: File;
  isFileUploaded: boolean = false;
  openTab: number = 0;
  @ViewChild(UploadComponent) uploadComponent;
  @ViewChild('importOptions', { read: ElementRef }) importOptionsHTML: ElementRef;


  constructor(private projectApolloService: ProjectApolloService, private router: Router) { }

  ngOnInit(): void {
  }

  getFile(file: File) {
    if (!file) {
      this.submitted = false;
      this.isFileUploaded = false;
      return;
    }
    this.file = file ? file : null;
    this.isFileUploaded = file ? true : false;
    this.hasFileUploaded.emit(this.isFileUploaded);
  }

  toggleTab(index) {
    this.openTab = index;
  }

  submitUploadRecords() {
    // this.projectApolloService
    //   .changeProjectTokenizer(this.projectId, this.selectedTokenizer)
    //   .pipe(first())
    //   .subscribe();
    // this.projectApolloService
    //   .updateProjectStatus(
    //     this.projectId,
    //     ProjectStatus.INIT_COMPLETE
    //   ).pipe(first()).subscribe()

    // Attach a file to the project
    // this.uploadComponent.projectId = this.projectId;
    // this.uploadComponent.reloadOnFinish = false;
    // this.uploadComponent.uploadStarted = true;
    // const finalFileName = this.uploadComponent.getFinalFileName(this.file?.name);
    // this.uploadComponent.reSubscribeToNotifications();
    // this.uploadComponent.uploadFileType.setValue("records");
    // this.uploadComponent.executeOnFinish = () => {
    //   timer(200).subscribe(() => {
    //     this.router.navigate(['projects', this.projectId, 'settings'])
    //   })
    // }
    this.uploadComponent.updateTokenizerAndProjectStatus(this.projectId);
    const finalFileName = this.uploadComponent.uploadFileToMinio(this.projectId, UploadFileType.RECORDS_NEW);
    this.uploadComponent.finishUpUpload(finalFileName, this.importOptionsHTML.nativeElement.value);
  }
}
