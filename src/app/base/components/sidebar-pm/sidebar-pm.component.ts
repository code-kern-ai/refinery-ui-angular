import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, Inject, EventEmitter, OnInit, Output, Input, HostListener, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RoutesRecognized } from '@angular/router';
import { Observable, Subscription, timer } from 'rxjs';
import { first, tap } from 'rxjs/operators';
import { AuthApiService } from '../../services/auth-api.service';
import { OrganizationApolloService } from '../../services/organization/organization-apollo.service';
import { DOCUMENT } from '@angular/common';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { ConfigApolloService } from '../../services/config/config-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { ConfigManager } from '../../services/config-service';
import { RouteManager } from 'src/app/util/route-manager';
import { createDefaultSideBarPmModals, SideBarPmModals } from './sidebar-pm-helper';


@Component({
  selector: 'kern-sidebar-pm',
  templateUrl: './sidebar-pm.component.html',
  styleUrls: ['./sidebar-pm.component.scss'],
  animations: [
    trigger('menu', [
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
export class SidebarPmComponent implements OnInit, OnDestroy {
  menuOpen = false;
  logoutUrl$: Observable<Object>;
  user$: any;
  organizationInactive: boolean;
  subscriptions$: Subscription[] = [];
  project$: any;
  projectId: string;
  projectQuery$: any;
  isFullscreen: boolean = false;
  @Output() firstName = new EventEmitter<Observable<any>>();
  toggleClass = 'ft-maximize';
  isManaged: boolean = true;
  hasUpdates: boolean;
  private static initialConfigRequest: boolean = false;
  routeColor: any;
  sideBarPmModals: SideBarPmModals = createDefaultSideBarPmModals();

  constructor(
    private organizationService: OrganizationApolloService,
    private activatedRoute: ActivatedRoute,
    private auth: AuthApiService,
    private projectApolloService: ProjectApolloService,
    private configService: ConfigApolloService,
    @Inject(DOCUMENT) private document: any
  ) { }
  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
  }

  ngOnInit(): void {
    this.user$ = this.organizationService.getUserInfo();
    this.projectId = this.activatedRoute.snapshot.paramMap.get('projectId');
    if (this.projectId != null) {
      [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    }

    this.firstName.emit(this.user$);
    this.logoutUrl$ = this.auth.getLogoutOut();
    this.subscriptions$.push(this.organizationService
      .getUserOrganization()
      .pipe(
        tap((org) => {
          this.organizationInactive = org == null;
        })
      )
      .subscribe());

    if (!SidebarPmComponent.initialConfigRequest) {
      this.requestVersionOverview();
      SidebarPmComponent.initialConfigRequest = true;
    }
    this.checkIfManagedVersion();
    this.routeColor = RouteManager.routeColor;

  }

  requestVersionOverview() {
    this.sideBarPmModals.versionOverview.data = null;
    this.configService
      .getVersionOverview()
      .pipe(first())
      .subscribe((versionOverview) => {
        this.sideBarPmModals.versionOverview.data = versionOverview;
        this.sideBarPmModals.versionOverview.data.forEach((version) => {
          version.parseDate = this.parseUTC(version.lastChecked);
        });
        this.sideBarPmModals.versionOverview.data.sort((a, b) => a.service.localeCompare(b.service));
        this.configService
          .hasUpdates()
          .pipe(first())
          .subscribe((hasUpdates) => this.hasUpdates = hasUpdates);
      });
  }

  onDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
  }


  openFullscreen() {
    this.isFullscreen = true;
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).mozRequestFullScreen) {
      /* Firefox */
      (document.documentElement as any).mozRequestFullScreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      (document.documentElement as any).webkitRequestFullscreen();
    } else if ((document.documentElement as any).msRequestFullscreen) {
      /* IE/Edge */
      (document.documentElement as any).msRequestFullscreen();
    }
  }

  /* Close fullscreen */
  closeFullscreen() {
    this.isFullscreen = false;
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen();
    } else if (this.document.mozCancelFullScreen) {
      /* Firefox */
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      /* IE/Edge */
      this.document.msExitFullscreen();
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onEscapeClick() {
    if (this.toggleClass == 'ft-minimize') {
      this.toggleClass = 'ft-maximize';
      this.isFullscreen = false;
    }
    else {
      this.toggleClass = 'ft-minimize';
      this.isFullscreen = true;

    }
  }

  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
  }

  howToUpdate() {
    this.sideBarPmModals.versionOverview.open = false;
    this.sideBarPmModals.steps.open = true;
  }

  back() {
    this.sideBarPmModals.steps.open = false;
    this.sideBarPmModals.versionOverview.open = true;
  }

  toggleTabs(index: number) {
    this.sideBarPmModals.steps.openTab = index;
  }

  copyToClipboard(textToCopy) {
    navigator.clipboard.writeText(textToCopy);
  }

  checkIfManagedVersion() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfManagedVersion());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }
}
