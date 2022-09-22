import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, Inject, EventEmitter, OnInit, Output, Input, HostListener, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, timer } from 'rxjs';
import { first, tap } from 'rxjs/operators';
import { AuthApiService } from '../../services/auth-api.service';
import { OrganizationApolloService } from '../../services/organization/organization-apollo.service';
import { RouteService } from '../../services/route.service';
import { DOCUMENT } from '@angular/common';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { ConfigApolloService } from '../../services/config/config-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { ConfigManager } from '../../services/config-service';
import { ConfigService } from 'aws-sdk';


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
export class SidebarPmComponent implements OnInit {
  menuOpen = false;
  url: string;
  activatedRoute$: Observable<ActivatedRoute>;
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
  versionOverview: any[] = [];
  @ViewChild('versionOverviewModal', { read: ElementRef }) versionOverviewModal: ElementRef;
  @ViewChild('stepsUpdate', { read: ElementRef }) stepsUpdate: ElementRef;
  openTab: number = 0;
  isManaged: boolean = true;
  hasUpdates: boolean;
  private static initialConfigRequest: boolean = false;

  constructor(
    private organizationService: OrganizationApolloService,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private auth: AuthApiService,
    private projectApolloService: ProjectApolloService,
    private configService: ConfigApolloService,
    @Inject(DOCUMENT) private document: any
  ) { }

  ngOnInit(): void {
    this.user$ = this.organizationService.getUserInfo();
    this.projectId = this.activatedRoute.snapshot.paramMap.get('projectId');
    if (this.projectId != null) {
      [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    }

    this.firstName.emit(this.user$);
    this.activatedRoute$ = this.routeService.getActivatedRoute();
    this.url = this.activatedRoute.snapshot.toString();
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
  }

  requestVersionOverview() {
    this.versionOverview = null;
    this.configService
      .getVersionOverview()
      .pipe(first())
      .subscribe((versionOverview) => {
        this.versionOverview = versionOverview;
        this.versionOverview.forEach((version) => {
          version.parseDate = this.parseUTC(version.lastChecked);
        });
        this.versionOverview.sort((a, b) => a.service.localeCompare(b.service));
        this.configService
          .hasUpdates()
          .pipe(first())
          .subscribe((hasUpdates) => this.hasUpdates = hasUpdates);
      });
  }

  onDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
  }

  matchRouteAndMenu(route, menuItem: string) {
    return route.url.value.toString().includes(menuItem);
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
    this.versionOverviewModal.nativeElement.checked = false;
    this.stepsUpdate.nativeElement.checked = true;
  }

  back() {
    this.stepsUpdate.nativeElement.checked = false;
    this.versionOverviewModal.nativeElement.checked = true;
  }

  toggleTabs(index: number) {
    this.openTab = index;
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
