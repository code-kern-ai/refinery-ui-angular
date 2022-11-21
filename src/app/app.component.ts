import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { NotificationApolloService } from './base/services/notification/notification-apollo.service';
import { interval } from 'rxjs';
import { Intercom } from 'ng-intercom';
import { OrganizationApolloService } from './base/services/organization/organization-apollo.service';
import { NotificationService } from './base/services/notification.service';
import { Router, RoutesRecognized, ActivatedRouteSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ConfigManager } from './base/services/config-service';
import { first } from 'rxjs/operators';
import { ConfigApolloService } from './base/services/config/config-apollo.service';
import { UserManager } from './util/user-manager';
import { CommentDataManager } from './base/components/comment/comment-helper';
import { RouteManager } from './util/route-manager';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnDestroy, OnInit, AfterViewInit {
  test = false;
  title = 'kern-frontspine';
  notificationList: any = [];
  deletionTimer: Subscription = null;
  loggedInUser: any;
  userSubscription$: Subscription;
  notifications$: any;
  notificationsSub$: any;
  notificationsQuery$: any;
  refetchTimer: any;
  @ViewChild('resizingModal') resizingModal: ElementRef;
  windowWidth: number;

  constructor(
    private notificationApolloService: NotificationApolloService,
    public intercom: Intercom,
    private organizationService: OrganizationApolloService,
    private configService: ConfigApolloService,
    private router: Router,
    private http: HttpClient,
    private cfRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initialRequests();
    NotificationService.subscribeToNotification(this, {
      whitelist: ['notification_created', 'project_deleted', 'config_updated'],
      func: this.handleWebsocketNotification
    });
    this.initializeNotificationService();
    this.initWithConfigManager();
    this.checkBrowser();
  }

  ngAfterViewInit() {
    this.onResize();
  }

  ngAfterViewChecked() {
    this.cfRef.detectChanges();
  }

  initialRequests() {
    CommentDataManager.initManager(this.organizationService);
    RouteManager.initRouteManager(this.router, this.organizationService);
    this.configService.isManaged().pipe(first()).subscribe((v) => ConfigManager.initConfigManager(this.http, this.configService, v));
    this.configService.isDemo().pipe(first()).subscribe((v) => ConfigManager.setIsDemo(v));
    this.configService.isAdmin().pipe(first()).subscribe((v) => ConfigManager.setIsAdmin(v));
    this.configService.getBlackWhiteDemo().pipe(first()).subscribe((v) => ConfigManager.setBlackWhiteListDemo(v));
  }


  initWithConfigManager() {

    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.initWithConfigManager());
      return;
    }
    this.initializeIntercom();
    //caution! the first user request needs to run after the db creation since otherwise the backend will try to create an unasigned user
    this.organizationService.getUserInfo().pipe(first()).subscribe((v) => UserManager.initUserManager(this.router, this.organizationService, v));
  }

  initializeIntercom() {

    const token = ConfigManager.getConfigValue("tokens", "INTERCOM")

    this.userSubscription$ = this.organizationService
      .getUserInfo()
      .subscribe((user) => {
        this.loggedInUser = user;

        if (token != "") {
          this.intercom.boot({
            app_id: token,
            name: user.firstName + ' ' + user.lastName,
            email: user.mail,
            user_id: user.id,
            widget: {
              activator: '#intercom',
            },
          });
        }

      });
  }

  initializeNotificationService() {
    [this.notificationsQuery$, this.notifications$] = this.notificationApolloService.getNotificationsByUser();
    this.notificationsSub$ = this.notifications$.subscribe((n) => {
      n.forEach((element) =>
        this.handleNotificationElement(element)
      );
      if (n.length > 0) this.initializeNotificationDeletion();
      this.refetchTimer = null;
    });

  }

  initializeNotificationDeletion() {
    if (this.deletionTimer == null) {
      this.deletionTimer = interval(3000).subscribe((x) => {
        if (this.notificationList.length > 0) {
          this.notificationList.shift();
          if (this.notificationList.length == 0)
            this.unsubscribeDeletionTimer();
        } else {
          this.unsubscribeDeletionTimer();
        }
      });
    }
  }

  handleNotificationElement(notification) {
    notification.open = false;
    this.notificationList.push(notification);
    timer(10).subscribe(() => (notification.open = true));
  }

  unsubscribeDeletionTimer() {
    if (!(this.deletionTimer == null)) {
      this.deletionTimer.unsubscribe();
      this.deletionTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.userSubscription$.unsubscribe();
    if (!(this.deletionTimer == null)) {
      this.deletionTimer.unsubscribe();
    }
    if (this.notificationsSub$) this.notificationsSub$.unsubscribe();
    NotificationService.unsubscribeFromNotification(this);
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'notification_created') {
      if (msgParts[2] != this.loggedInUser?.id) return;
      if (this.refetchTimer) return;
      this.refetchTimer = timer(500).subscribe(() => {
        this.notificationsQuery$.resetLastResults();
        this.notificationsQuery$.refetch();
        this.refetchTimer = null;
      });
    } else if (msgParts[1] == 'project_deleted') {

      const projectId = this.router.url.split("/")[2];
      if (projectId == msgParts[2]) {
        alert("Project was deleted!");
        this.router.navigate(["/projects"]);
      }
    } else if (msgParts[1] == 'config_updated') {
      ConfigManager.refreshConfig();
    }
  }

  checkBrowser() {
    const wasChecked = localStorage.getItem("browser_info_checked");
    if (!wasChecked) {
      const agent = window.navigator.userAgent;
      if (!(agent.indexOf("Chrome/") != -1 && agent.indexOf("Chromium/") == -1) || agent.indexOf("Edg/") != -1) {
        const t = "This application was built with chrome. Some things might look different than expected.\n\nFor the best experience we recommend using chrome."
        alert(t);
      }
      localStorage.setItem("browser_info_checked", "1");
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.windowWidth = window.innerWidth;
    if (window.innerWidth < 1400) {
      this.resizingModal.nativeElement.checked = true;
    }
  }


}
