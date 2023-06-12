import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthApiService } from 'src/app/base/services/auth-api.service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { Subscription } from 'rxjs';
import { getUserAvatarUri } from 'src/app/util/helper-functions';


@Component({
  selector: 'kern-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss'],
})
export class ProjectComponent implements OnInit, OnDestroy {
  project$: any;
  projectId: string;
  projectQuery$: any;
  url: string;
  activatedRoute$: any;
  hasRecords: boolean = false;
  user$: any;
  user: any;
  subscriptions$: Subscription[] = [];
  avatarUri: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private routeService: RouteService,
    private projectApolloService: ProjectApolloService,
    private organizationService: OrganizationApolloService,
    private auth: AuthApiService,
  ) { }

  ngOnDestroy(): void {
    NotificationService.unsubscribeFromNotification(this, this.projectId);
  }

  ngOnInit(): void {
    this.projectId = this.activatedRoute.snapshot.paramMap.get('projectId');
    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    this.activatedRoute$ = this.routeService.getActivatedRoute();
    this.organizationService.getUserInfo().pipe(first())
      .subscribe((user) => {
        this.user = user;
        this.avatarUri = getUserAvatarUri(this.user);
      });

    this.collectHasRecords(this.projectId);

    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['file_upload'],
      func: this.handleWebsocketNotification
    });
    NotificationService.subscribeToNotification(this, {
      whitelist: ['project_update'],
      func: this.handleWebsocketGlobalNotification
    });
  }

  collectHasRecords(projectId: string) {
    this.projectApolloService.getProjectUploadedRecords(projectId).pipe(first()).subscribe(prj => {
      this.hasRecords = prj.numDataScaleUploaded != 0;
    })
  }


  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'file_upload' && msgParts[3] == 'state' && msgParts[4] == 'DONE') {
      this.collectHasRecords(this.projectId);
    }
  }

  handleWebsocketGlobalNotification(msgParts) {
    if ('project_update' == msgParts[1]) {
      this.projectQuery$.refetch();
    }
  }

  getFirstName(userName) {
    this.user$ = userName;
  }
}
