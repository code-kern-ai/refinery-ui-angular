import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectStatistics } from 'src/app/base/entities/project-statistics';
import { AuthApiService } from 'src/app/base/services/auth-api.service';
import { ConfigManager } from 'src/app/base/services/config-service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { UploadComponent } from 'src/app/import/components/upload/upload.component';
import { ProjectStatus } from 'src/app/projects/enums/project-status.enum';
import { dateAsUTCDate, getUserAvatarUri, isStringTrue } from 'src/app/util/helper-functions';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  hasName: boolean;
  useMultiLabel: boolean = false;

  // TODO: add not empty check and highlight
  name = new FormControl(null);
  description = new FormControl('');
  projectId: string;

  selectedTokenizer = 'en_core_web_sm';
  tokenizerForm = new FormControl(this.selectedTokenizer);
  tokenizerValues = [];

  modalOpen: boolean = false;

  organizationName: string;
  organizationInactive: boolean;
  project$: Observable<Project>;
  project: Project;
  user$: any;
  user: any;
  avatarUri: string;
  @ViewChild(UploadComponent) uploadComponent;
  file: File;

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

  constructor(
    private projectApolloService: ProjectApolloService,
    private organizationApolloService: OrganizationApolloService,
    private router: Router,
    private auth: AuthApiService,
    private urlSanatizer: DomSanitizer
  ) { }

  get ProjectStatusType(): typeof ProjectStatus {
    return ProjectStatus;
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
          projectItem.timeStamp = this.parseUTC(projectItem.createdAt);
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
      whitelist: ['project_created', 'project_deleted', 'project_update', 'file_upload'],
      func: this.handleWebsocketNotification
    });

    this.projectApolloService
      .getAllTokenizerOptions()
      .pipe(first())
      .subscribe((v) => {
        this.tokenizerValues = this.checkWhitelistTokenizer(v);
      });

    this.name.valueChanges.subscribe((value) => {
      if (value.length > 0) {
        this.hasName = true;
      } else {
        this.hasName = false;
      }
    });

    this.tokenizerForm.valueChanges.subscribe(
      (value) => (this.selectedTokenizer = value)
    );
  }


  checkWhitelistTokenizer(tokenizer) {
    tokenizer = Array.from(tokenizer);
    let firstNotAvailable = true;
    let insertPos = -1;
    for (let i = 0; i < tokenizer.length; i++) {
      let t = { ...tokenizer[i] };
      if (t.configString != 'en_core_web_sm' && t.configString != 'de_core_news_sm') {
        if (firstNotAvailable) {
          insertPos = i;
          firstNotAvailable = false;
        }
        t.disabled = true;
      } else {
        t.disabled = null;
      }
    }

    if (insertPos != -1) {
      tokenizer.splice(insertPos, 0, { disabled: true, name: "------------------------------------------" });
      tokenizer.splice(insertPos, 0, { disabled: true, name: "if you need the options below feel free to contact us", configString: "intercom/email" });
      tokenizer.splice(insertPos, 0, { disabled: true, name: "------------------------------------------" });
    }

    return tokenizer
  }

  canCreateProject(): boolean {
    if (!this.name?.value) return false;
    if (this.name.value.trim() == '') return false;
    if (this.projectList) for (const p of this.projectList) if (p.name == this.name.value) return false;
    return true;
  }
  initializeProject() {
    if (!this.canCreateProject()) return;
    this.projectApolloService
      .createProject(this.name.value, this.description.value)
      .pipe(first()).subscribe((p: Project) => {
        this.project = p;
        this.projectId = p.id;
        this.projectApolloService
          .changeProjectTokenizer(p.id, this.selectedTokenizer)
          .pipe(first())
          .subscribe();
        this.projectApolloService
          .updateProjectStatus(
            this.projectId,
            ProjectStatus.INIT_COMPLETE
          ).pipe(first()).subscribe()
        this.router.navigate(['projects', p.id, 'settings'])

      });
  }

  focusModalInputBox(event: Event, inputBoxName: string) {
    if (event.target instanceof HTMLInputElement) {
      const modalDiv = event.target.nextSibling;
      if (modalDiv instanceof HTMLElement) {
        const inputChildren = modalDiv.getElementsByTagName('INPUT');
        for (var i = 0; i < inputChildren.length; ++i) {
          var node = inputChildren[i];
          if (
            node instanceof HTMLElement &&
            node.getAttribute('name') == inputBoxName
          ) {
            node.focus();
            return;
          }
        }
      }
    }
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
      this.projectListQuery$.refetch();
      this.projectStatQuery$.refetch();
    }
  }

  getFirstName(userName) {
    this.user$ = userName;
  }

  getFile(file: File) {
    this.file = file;
  }

  importExistingProject() {
    this.uploadComponent.createEmptyProject().subscribe((project: Project) => {
      this.projectApolloService
        .changeProjectTokenizer(project.id, this.selectedTokenizer)
        .pipe(first())
        .subscribe();
      this.projectApolloService
        .updateProjectStatus(
          project.id,
          ProjectStatus.INIT_COMPLETE
        ).pipe(first()).subscribe()

      // Attach a file to the project
      this.uploadComponent.projectId = null;
      this.uploadComponent.reSubscribeToNotifications();
      this.uploadComponent.projectId = project.id;
      this.uploadComponent.reloadOnFinish = true;
      this.uploadComponent.uploadStarted = true;
      this.uploadComponent.finishUpUpload(this.file?.name, '');

    });
  }

  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
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
}
