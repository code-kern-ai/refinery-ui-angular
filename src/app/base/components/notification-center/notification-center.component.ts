import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { NotificationApolloService } from 'src/app/base/services/notification/notification-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Router } from '@angular/router';
import { interval, Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { AuthApiService } from 'src/app/base/services/auth-api.service';
import { UserManager } from 'src/app/util/user-manager';
import { dateAsUTCDate } from 'submodules/javascript-functions/date-parser';
import { getUserAvatarUri } from 'src/app/util/helper-functions';


type NotificationListWrapper = {
  highlightMe: boolean;
  array: any[];
};
@Component({
  selector: 'kern-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {

  subscriptions$: Subscription[] = [];
  projectNames = {};
  notifications: NotificationListWrapper[] = []; // can be used to display the stacked notifications with same type in future
  expandedNotifications = new Set();
  loggedInUser: any;
  notificationsQuery$: any;
  organizationName: string;
  organizationInactive: boolean;
  avatarUri: string;
  setOutline: boolean = false;
  clickedNotificationId: string = null;
  static componentSingleton: NotificationCenterComponent = null;
  @Output() linkClicked = new EventEmitter<boolean>();

  constructor(
    private auth: AuthApiService,
    private notificationService: NotificationApolloService,
    private organizationService: OrganizationApolloService,
    private projectService: ProjectApolloService,
    private router: Router,) {
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach(subscription => {
      subscription.unsubscribe();
    });
    NotificationService.unsubscribeFromNotification(this);
    NotificationCenterComponent.componentSingleton = null;
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    NotificationCenterComponent.componentSingleton = this;
    this.organizationService
      .getUserOrganization()
      .pipe(first()).subscribe((org) => {
        this.organizationInactive = org == null;
        if (!this.organizationInactive) {
          this.organizationName = org.name;
        }
      });
    this.organizationService.getUserInfo().pipe(first())
      .subscribe((user) => {
        this.loggedInUser = user
        this.avatarUri = getUserAvatarUri(this.loggedInUser)
      });
    this.refreshProjectNames();
    let vc;
    [this.notificationsQuery$, vc] = this.notificationService.getNotifications();

    this.subscriptions$.push(vc.subscribe(
      notifications => this.buildNotificationsArray(notifications)
    ));
    this.subscriptions$.push(interval(30000).subscribe(val => {
      this.notifications.forEach(notificationTypeList => {
        notificationTypeList.array.forEach(notification => {
          notification.timePassed = this.timeDiffCalc(dateAsUTCDate(notification.createdAtDate));
        });
      })
    }));
    NotificationService.subscribeToNotification(this, {
      whitelist: ['project_created', 'project_deleted', 'project_update', 'notification_created'],
      func: this.handleWebsocketNotification
    });
  }

  buildNotificationsArray(notifications) {
    const array = [];
    this.notifications = []
    notifications.forEach(notification => {

      notification = { ...notification };
      notification.createdAtDate = new Date(notification.createdAt);
      const convertDateAsUTCDate = dateAsUTCDate(notification.createdAtDate);
      notification.date = convertDateAsUTCDate.toLocaleString();
      notification.timePassed = this.timeDiffCalc(convertDateAsUTCDate);
      if (Object.keys(this.projectNames).length != 0) notification.projectName = this.projectNames[notification.projectId];
      this.applyPageChanges(notification)
      if (!(this.notifications.length)) {
        this.notifications.push({
          highlightMe: false,
          array: [notification]
        });
      } else if (this.notifications[this.notifications.length - 1].array[0].type === notification.type && this.notifications[this.notifications.length - 1].array[0].projectId === notification.projectId) {
        this.notifications[this.notifications.length - 1].array.push(notification);
      }
      else {
        this.notifications.push({
          highlightMe: false,
          array: [notification]
        });
      }
    });
    return this.notifications
  }

  refreshProjectNames() {
    let query, vc;
    [query, vc] = this.projectService.getProjects();
    this.projectNames = {}
    vc.pipe(first()).subscribe(projects => {
      projects.forEach(project => this.projectNames[project.id] = project.name);
      this.updateNotificationProjectNames();
    });

  }
  updateNotificationProjectNames() {
    if (Object.keys(this.projectNames).length == 0) return;
    this.notifications.forEach(notification_bucket => {
      if (this.projectNames[notification_bucket.array[0].projectId]) {
        notification_bucket.array[0].projectName = this.projectNames[notification_bucket.array[0].projectId];
      } else notification_bucket.array[0].projectName = "<project deleted>";
    });
  }

  applyPageChanges(notification) {
    if (notification.type == "CUSTOM" && notification.message == 'Continuation of your previous session.') {
      notification.page = "labeling"
    }
  }

  navigateToProjectPage(notification): void {
    this.redirectTo('projects/' + notification.projectId + '/' + notification.page);
    this.linkClicked.emit(false);
  }

  redirectTo(uri: string) {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
      this.router.navigate([uri]));
  }

  switchExpandedState(notification) {
    if (this.expandedNotifications.has(notification.id)) {
      this.expandedNotifications.delete(notification.id)
    }
    else {
      this.expandedNotifications.add(notification.id)
    }
  }

  timeDiffCalc(date: any) {
    let diffInMilliSeconds = Math.abs(Date.now() - date) / 1000;

    // calculate days
    const days = Math.floor(diffInMilliSeconds / 86400);
    diffInMilliSeconds -= days * 86400;
    if (days > 0) {
      return (days === 1) ? `${days} day` : `${days} days`;
    }

    // calculate hours
    const hours = Math.floor(diffInMilliSeconds / 3600) % 24;
    diffInMilliSeconds -= hours * 3600;
    if (hours > 0) {
      return (hours === 1) ? `${hours} hour` : `${hours} hours`;
    }

    // calculate minutes
    const minutes = Math.floor(diffInMilliSeconds / 60) % 60;
    diffInMilliSeconds -= minutes * 60;
    if (minutes > 0) {
      return (minutes === 1) ? `${minutes} minute` : `${minutes} minutes`;
    }
    return `less than a minute`
  }

  handleWebsocketNotification(msgParts) {
    if (['project_created', 'project_deleted', 'project_update'].includes(msgParts[1])) {
      this.refreshProjectNames();
    }
    else if (msgParts[1] == 'notification_created') {
      //once not only the user filter is active this condition can be changed
      if (msgParts[2] == this.loggedInUser?.id) this.notificationsQuery$.refetch();
    }
  }

  private checkHighlighting(notificationId: string) {
    this.clickedNotificationId = notificationId;
    this.notifications.forEach(notificationTypeList => {
      notificationTypeList.highlightMe = notificationId ? notificationTypeList.array.some(notification => notification.id == this.clickedNotificationId) : false;
    })
  }

  static outlineSelectedNotification(notificationId: string) {
    if (!NotificationCenterComponent.componentSingleton) {
      console.log("componentSingleton is not initialized yet");
      return;
    }
    NotificationCenterComponent.componentSingleton.checkHighlighting(notificationId);
    timer(5000).subscribe(() => {
      if (!NotificationCenterComponent.componentSingleton) return;
      NotificationCenterComponent.componentSingleton.checkHighlighting(null);
    })
  }
}

