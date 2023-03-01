import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { NotificationApolloService } from './base/services/notification/notification-apollo.service';
import { interval } from 'rxjs';
import { OrganizationApolloService } from './base/services/organization/organization-apollo.service';
import { NotificationService } from './base/services/notification.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ConfigManager } from './base/services/config-service';
import { first } from 'rxjs/operators';
import { ConfigApolloService } from './base/services/config/config-apollo.service';
import { UserManager } from './util/user-manager';
import { CommentDataManager } from './base/components/comment/comment-helper';
import { RouteManager } from './util/route-manager';
import { NotificationCenterComponent } from './base/components/notification-center/notification-center.component';
import { ProjectApolloService } from './base/services/project/project-apollo.service';
import { AdminMessage, AdminMessageLevel, adminMessageLevels } from './util/admin-messages-helper';
import { jsonCopy, parseUTC } from './util/helper-functions';

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
  notifications$: any;
  notificationsSub$: any;
  notificationsQuery$: any;
  refetchTimer: any;
  windowWidth: number;
  sizeWarningOpen: boolean = false;
  minWidth: number = 1250;
  activeAdminMessages$: any;
  activeAdminMessagesQuery$: any;
  activeAdminMessages: AdminMessage[];
  adminMessageLevels = adminMessageLevels;
  subscriptions$: Subscription[] = [];
  get AdminMessageLevel(): typeof AdminMessageLevel {
    return AdminMessageLevel;
  }

  constructor(
    private notificationApolloService: NotificationApolloService,
    private organizationService: OrganizationApolloService,
    private configService: ConfigApolloService,
    private router: Router,
    private http: HttpClient,
    private cfRef: ChangeDetectorRef,
    private projectApolloService: ProjectApolloService,
  ) { }

  ngOnInit(): void {
    this.initialRequests();
    NotificationService.subscribeToNotification(this, {
      whitelist: ['notification_created', 'project_deleted', 'config_updated', 'admin_message'],
      func: this.handleWebsocketNotification
    });
    this.initializeNotificationService();
    this.initWithConfigManager();
    this.checkBrowser();
    UserManager.registerAfterInitActionOrRun(this, () => this.loggedInUser = UserManager.getUser(), true);
    [this.activeAdminMessagesQuery$, this.activeAdminMessages$] = this.projectApolloService.getAllActiveAdminMessages();
    this.subscriptions$.push(this.activeAdminMessages$.subscribe((activeMessages: AdminMessage[]) => {
      const saveActiveMessages = [];
      activeMessages.forEach((message) => {
        const saveMessage = jsonCopy(message)
        saveMessage.displayDate = parseUTC(message.archiveDate);
        saveActiveMessages.push(saveMessage);
      });
      this.activeAdminMessages = saveActiveMessages;
    }));
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
    //caution! the first user request needs to run after the db creation since otherwise the backend will try to create an unasigned user
    this.organizationService.getUserInfo().pipe(first()).subscribe((v) => UserManager.initUserManager(this.router, this.organizationService, v));
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
    if (!(this.deletionTimer == null)) {
      this.deletionTimer.unsubscribe();
    }
    if (this.notificationsSub$) this.notificationsSub$.unsubscribe();
    NotificationService.unsubscribeFromNotification(this);
    this.subscriptions$.forEach((sub) => sub.unsubscribe());
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
    } else if (msgParts[1] == 'admin_message') {
      this.activeAdminMessagesQuery$.refetch();
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
    if (window.innerWidth < this.minWidth) {
      this.sizeWarningOpen = true;
    } else {
      this.sizeWarningOpen = false;
    }
  }

  onNotificationClick(notification) {
    NotificationCenterComponent.outlineSelectedNotification(notification.id);
  }


  getBackground(level) {
    const color = this.adminMessageLevels.find((l) => l.value == level).color;
    return `bg-${color}-100`
  }

  getText(level) {
    const color = this.adminMessageLevels.find((l) => l.value == level).color;
    return `text-${color}-700`
  }

  getBorder(level) {
    const color = this.adminMessageLevels.find((l) => l.value == level).color;
    return `border-${color}-400`
  }
}
