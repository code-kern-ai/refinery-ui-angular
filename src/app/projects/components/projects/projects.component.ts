import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectStatistics } from 'src/app/base/entities/project-statistics';
import { ConfigManager } from 'src/app/base/services/config-service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { ProjectStatus } from 'src/app/projects/enums/project-status.enum';
import { getUserAvatarUri } from 'src/app/util/helper-functions';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { createDefaultProjectsModals, ProjectsModals } from './projects-helper';
import { UploadFileType } from 'src/app/import/components/helpers/upload-types';
import { parseUTC } from 'submodules/javascript-functions/date-parser';
import { isStringTrue } from 'submodules/javascript-functions/general';

@Component({
  selector: 'kern-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
  animations: [
    trigger('newProject', [
      state(
        'enabled',
        style({
          transform: 'scale(1)',
          opacity: 1,
        })
      ),
      state(
        'disabled',
        style({
          transform: 'scale(0.95)',
          opacity: 0,
          display: 'none',
        })
      ),
      transition('enabled => disabled', [
        animate('75ms cubic-bezier(0.4, 0, 1, 1)'),
      ]),
      transition('disabled => enabled', [
        animate('100ms cubic-bezier(0, 0, 0.2, 1)'),
      ]),
    ]),
  ],
})
export class ProjectsComponent implements OnInit, OnDestroy {
  projectListQuery$: any;
  projectList: Project[];
  projectStatQuery$: any;
  projectStatisticsById: Map<string, ProjectStatistics> = new Map<string, ProjectStatistics>();
  subscriptions$: Subscription[] = [];
  useMultiLabel: boolean = false;
  projectId: string;
  tokenizerValues = [];
  organizationName: string;
  organizationInactive: boolean;
  project$: Observable<Project>;
  project: Project;
  user$: any;
  user: any;
  avatarUri: string;
  static youtubeUrl: string = "https://www.youtube.com/embed/Hwlu6GWzDH8?autoplay=1&enablejsapi=1";
  saveUrl: SafeResourceUrl;
  canCreateOrg: boolean = false;
  isManaged: boolean = true;
  isProjectInitial: boolean = false;
  previousValue: string;
  isDemoUser: boolean = false;
  adminData = {
    isAdmin: false,
    prjDeleteModalOpen: false,
    prjDeleteProject: null as Project,
  }
  projectsModals: ProjectsModals = createDefaultProjectsModals();
  unknownUser: string = '<unknown user>';
  showBadPasswordMsg: boolean = false;

  constructor(
    private projectApolloService: ProjectApolloService,
    private organizationApolloService: OrganizationApolloService,
    private router: Router,
    private urlSanatizer: DomSanitizer
  ) { }

  get ProjectStatusType(): typeof ProjectStatus {
    return ProjectStatus;
  }

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach(subscription => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this);
  }


  ngOnInit(): void {
    this.organizationApolloService
      .getUserOrganization()
      .pipe(first()).subscribe((org) => {
        this.organizationInactive = org == null;
        if (!this.organizationInactive) {
          this.organizationName = org.name;
          this.initData();
        }
      });
    this.organizationApolloService.getUserInfo().pipe(first())
      .subscribe((user) => {
        this.user = user;
        this.avatarUri = getUserAvatarUri(this.user);
        if (this.organizationInactive) {
          this.createDefaultOrg(user);
        }
      });
    this.checkIfDemoUser();
  }

  checkIfDemoUser() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfDemoUser());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
    this.adminData.isAdmin = ConfigManager.getIsAdmin();
    this.isDemoUser = ConfigManager.getIsDemo() && !this.adminData.isAdmin;
  }

  createDefaultOrg(user) {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.createDefaultOrg(user));
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
    if (!this.isManaged && !ConfigManager.getIsDemo()) {
      this.subscriptions$.push(this.organizationApolloService.canCreateLocalOrg().pipe(first()).subscribe((canCreateOrg) => {
        this.canCreateOrg = canCreateOrg;

        if (this.canCreateOrg) {
          const localhostOrg = "localhost";

          this.organizationApolloService.createOrganization(localhostOrg).pipe(first()).subscribe(
            () => this.organizationApolloService.addUserToOrganization(user.mail, localhostOrg).pipe(first()).subscribe(
              () => location.reload()
            )
          )
        }
      }));
    }
  }

  initData() {
    let tmp;
    [this.projectListQuery$, tmp] = this.projectApolloService.getProjects();
    this.subscriptions$.push(tmp.subscribe((projectList) => {

      projectList.sort((a, b) => a.name.localeCompare(b.name));
      projectList.forEach(projectItem => {
        if (projectItem.createdAt) {
          projectItem.timeStamp = parseUTC(projectItem.createdAt);
          const splitDateTime = projectItem.timeStamp.split(',');
          projectItem.date = splitDateTime[0].trim();
          projectItem.time = splitDateTime[1];
        };
      });
      this.projectList = projectList.filter(a => a.status != ProjectStatus.IN_DELETION);
    }));
    [this.projectStatQuery$, tmp] = this.organizationApolloService.getOverviewStats();
    this.subscriptions$.push(tmp.subscribe((stats) => {
      if (stats) {
        stats.forEach(e => {
          this.projectStatisticsById.set(e.projectId, e);
        });
      }
    }));
    NotificationService.subscribeToNotification(this, {
      whitelist: ['project_created', 'project_deleted', 'project_update', 'file_upload', 'bad_password'],
      func: this.handleWebsocketNotification
    });
  }

  manageProject(projectId: string, recordsInProject: Number): void {
    if (this.user?.role == 'ENGINEER') {
      if (recordsInProject == 0) {
        this.router.navigate(['projects', projectId, 'settings']);
      } else {
        this.router.navigate(['projects', projectId, 'overview']);
      }
    } else {
      this.router.navigate(['projects', projectId, 'labeling']);
    }
  }

  handleWebsocketNotification(msgParts) {
    if (!this.projectListQuery$) return;
    if (['project_created', 'project_deleted', 'project_update'].includes(msgParts[1])) {
      timer(500).subscribe(() => {
        this.projectListQuery$.refetch();
        this.projectStatQuery$.refetch();
      });
    }
    if (msgParts[1] == 'bad_password') {
      this.showBadPasswordMsg = true;
    }
  }

  setFirstName(userName) {
    this.user$ = userName;
  }

  startPlayback() {
    this.saveUrl = this.urlSanatizer.bypassSecurityTrustResourceUrl(ProjectsComponent.youtubeUrl);
  }

  executeOption(value: string) {
    if (value == 'Further sample projects') {
      window.open("https://github.com/code-kern-ai/refinery-sample-projects", "_blank");
    } else {
      this.importSampleProject(this.isProjectInitial ? this.previousValue + ' - initial' : value)
    }
  }

  importSampleProject(projectName) {
    this.projectApolloService.createSampleProject(projectName).pipe(first()).subscribe((p: Project) => {
      if (this.router.url == "/projects") {
        this.router.navigate(['projects', p.id, 'overview']);
      }
    });
  }

  setInitialValue(projectInitial) {
    this.isProjectInitial = projectInitial.flagInitial;
    this.previousValue = projectInitial.value;
  }


  adminOpenOrDeleteProject(project: Project) {
    if (!this.adminData.isAdmin) return;
    const deleteInstant = isStringTrue(localStorage.getItem("adminInstantDelete"));
    this.adminData.prjDeleteProject = project;
    if (deleteInstant) this.adminDeleteProject();
    else {
      this.adminData.prjDeleteModalOpen = true;
    }
  }
  adminStoreInstantAndDelete() {
    localStorage.setItem("adminInstantDelete", "X");
    this.adminDeleteProject();
  }

  adminDeleteProject() {
    if (!this.adminData.isAdmin || !this.adminData.prjDeleteProject) return;
    this.projectApolloService.deleteProjectById(this.adminData.prjDeleteProject.id).pipe(first()).subscribe();
  }

  refetchProjects(refetch: boolean) {
    if (!refetch) return;
    this.projectListQuery$.refetch();
  }

  setBadPasswordMsg(showBadPassMgs: boolean) {
    this.showBadPasswordMsg = showBadPassMgs;
  }
}
