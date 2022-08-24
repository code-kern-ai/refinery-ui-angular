import { Component, OnDestroy, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy, OnInit {
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

  constructor(
    private notificationApolloService: NotificationApolloService,
    public intercom: Intercom,
    private organizationService: OrganizationApolloService,
    private configService: ConfigApolloService,
    private router: Router,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.initalRequests();
    NotificationService.subscribeToNotification(this, {
      whitelist: ['notification_created', 'project_deleted', 'config_updated'],
      func: this.handleWebsocketNotification
    });
    this.initializeNotificationService();
    this.initWithConfigManager();
    this.checkBrowser();
  }

  initalRequests() {
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
    this.initRouterListener();
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

  initRouterListener() {

    this.router.events.subscribe((val) => {
      if (val instanceof RoutesRecognized) {
        if (ConfigManager.getConfigValue("allow_data_tracking")) {
          const event = { old: this.router.url, new: val.url, name: this.getRecusiveRouteData(val.state.root) };
          this.organizationService.postEvent("AppNavigation", JSON.stringify(event)).pipe(first()).subscribe();
        }
      }
    });
  }
  getRecusiveRouteData(root: ActivatedRouteSnapshot, key: string = 'name') {
    if (root.firstChild) {
      return this.getRecusiveRouteData(root.firstChild)
    }
    return root.data[key]
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
      if (msgParts[2] != this.loggedInUser.id) return;
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


}
