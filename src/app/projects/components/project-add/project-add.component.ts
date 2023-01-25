import { AfterViewChecked, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { first } from 'rxjs/operators';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Project } from 'src/app/base/entities/project';
import { RouteService } from 'src/app/base/services/route.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { UploadFileType } from 'src/app/import/components/helpers/upload-types';

@Component({
  selector: 'kern-project-add',
  templateUrl: './project-add.component.html',
  styleUrls: ['./project-add.component.scss']
})
export class ProjectAddComponent implements OnInit, AfterViewChecked {

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  user$: any;
  subscriptions$: Subscription[] = [];
  project: Project;
  project$: any;
  projectQuery$: any;
  organizationName: string;
  organizationInactive: boolean;
  projectId: string;

  constructor(
    private routeService: RouteService,
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
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach(subscription => subscription.unsubscribe());
  }
}
