import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, Inject, EventEmitter, OnInit, Output, Input, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthApiService } from '../../services/auth-api.service';
import { OrganizationApolloService } from '../../services/organization/organization-apollo.service';
import { RouteService } from '../../services/route.service';
import { DOCUMENT } from '@angular/common';
import { ProjectApolloService } from '../../services/project/project-apollo.service';


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

  constructor(
    private organizationService: OrganizationApolloService,
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private auth: AuthApiService,
    private projectApolloService: ProjectApolloService,
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
  }

  onDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
  }

  matchRouteAndMenu(route, menuItem: string) {
    return route.url.value.toString().includes(menuItem);
  }

  toggleVisible(isVisible: boolean, menuButton: HTMLDivElement, svgIcon: HTMLDivElement): void {
    if (isVisible) {
      menuButton.classList.remove('hidden');
      menuButton.classList.add('flex');
      svgIcon.classList.remove('flex');
      svgIcon.classList.add('hidden');
    } else {
      menuButton.classList.remove('flex');
      menuButton.classList.add('hidden');
      svgIcon.classList.remove('hidden');
      svgIcon.classList.add('flex');
    }
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
    if(this.toggleClass == 'ft-minimize'){
      this.toggleClass = 'ft-maximize';
      this.isFullscreen = false;
    }
    else{
      this.toggleClass = 'ft-minimize';
      this.isFullscreen = true;

    }
  }
}
