import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthApiService } from 'src/app/base/services/auth-api.service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { Subscription } from 'rxjs';


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
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['project_update', 'file_upload'],
      func: this.handleWebsocketNotification
    });
    this.organizationService.getUserInfo().pipe(first())
      .subscribe((user) => {
        this.user = user
        const avatarSelector = (user.firstName[0].charCodeAt(0) + user.lastName[0].charCodeAt(0)) % 5;
        this.avatarUri = "assets/avatars/" + avatarSelector + ".png"
      });

    this.collectHasRecords(this.projectId);
  }

  collectHasRecords(projectId: string) {
    this.projectApolloService.getProjectUploadedRecords(projectId).pipe(first()).subscribe(prj => {
      this.hasRecords = prj.numDataScaleUploaded != 0;
    })
  }


  matchRouteAndMenu(route, menuItem: string) {
    return route.url?.value.toString().includes(menuItem);
  }

  getNgClasses(route, menuItem: string) {

    if (this.matchRouteAndMenu(route, menuItem)) {
      return 'border-kern text-gray-900'
    } else {
      if (!this.hasRecords) {
        return 'border-transparent pointer-events-none text-gray-200'
      } else {
        return 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }
    }
  }

  handleWebsocketNotification(msgParts) {
    if ('project_update' == msgParts[1]) {
      this.projectQuery$.refetch();
    } else if (msgParts[1] == 'file_upload' && msgParts[3] == 'state' && msgParts[4] == 'DONE') {
      this.collectHasRecords(this.projectId);
    }

  }

  getFirstName(userName) {
    this.user$ = userName;
  }
}
