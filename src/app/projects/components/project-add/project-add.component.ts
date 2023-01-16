import { AfterViewChecked, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AuthApiService } from 'src/app/base/services/auth-api.service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { ProjectStatus } from '../../enums/project-status.enum';
import { Project } from 'src/app/base/entities/project';
import { RouteService } from 'src/app/base/services/route.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { UploadRecordsComponent } from 'src/app/import/components/upload-records/upload-records.component';
import { UploadFileType, UploadFileTypeDisplay, UploadType } from 'src/app/import/components/helpers/upload-types';

@Component({
  selector: 'kern-project-add',
  templateUrl: './project-add.component.html',
  styleUrls: ['./project-add.component.scss']
})
export class ProjectAddComponent implements OnInit, AfterViewChecked {

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  get UploadFileTypeDisplay(): typeof UploadFileTypeDisplay {
    return UploadFileTypeDisplay;
  }

  user$: any;
  subscriptions$: Subscription[] = [];
  uploadData: FormGroup;
  selectedTokenizer = 'en_core_web_sm';
  tokenizerValues = [];
  checkIfUpload: boolean;
  project: Project;
  project$: any;
  projectQuery$: any;
  submitted: boolean = false;
  @ViewChild(UploadRecordsComponent) uploadRecordsComponent;
  organizationName: string;
  organizationInactive: boolean;
  projectId: string;
  hasFileUploaded: boolean = false;

  constructor(
    private routeService: RouteService,
    private formBuilder: FormBuilder,
    private organizationApolloService: OrganizationApolloService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private cdRef: ChangeDetectorRef) { }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);

    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    this.project$.subscribe((project) => this.project = project);

    this.organizationApolloService
      .getUserOrganization()
      .pipe(first()).subscribe((org) => {
        this.organizationInactive = org == null;
        if (!this.organizationInactive) {
          this.organizationName = org.name;
        }
      });

    this.uploadData = this.formBuilder.group({
      uploadFile: [0, Validators.required]
    });


  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach(subscription => subscription.unsubscribe());
  }


  uploadDataToProject(uploadType: UploadType = UploadType.DEFAULT): boolean {
    this.uploadRecordsComponent.uploadComponent.uploadType = uploadType;
    this.uploadRecordsComponent.submitted = true;
    this.submitted = true;
    if (this.submitted && this.hasFileUploaded) {
      this.uploadRecordsComponent.submitUploadRecords();
      return true;
    }
    return false;
  }

  checkIfFileUploaded(hasFileUploaded: boolean) {
    this.hasFileUploaded = hasFileUploaded;
  }

  getProjectName(): string {
    return this.project?.name;
  }
}
