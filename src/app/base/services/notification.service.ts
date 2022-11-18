import { Injectable } from '@angular/core';
import { Subject, timer } from 'rxjs';
import { UserNotification } from '../entities/user-notification';
import { NotificationType } from '../enum/notification-type.enum';
import { webSocket } from "rxjs/webSocket";
import { OrganizationApolloService } from './organization/organization-apollo.service';
import { first } from 'rxjs/operators';


export type NotificationSubscription = {
  projectId?: string;
  whitelist?: string[];
  func: (msg) => void;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications = new Subject<UserNotification[]>();
  private ws_subject;

  private static registedNotificationListeners: Map<string, Map<Object, NotificationSubscription>> = new Map<string, Map<Object, NotificationSubscription>>();

  private timeOutIteration: number = 0;

  constructor(
    private organizationService: OrganizationApolloService,) {
    timer(500).subscribe(() => this.initWsService())
  }

  public addNotifications(notifications: string[]) {
    let newNotification = UserNotification.createUserNotification(
      NotificationType.ERROR,
      notifications
    );

    this.notifications.next([newNotification]);
  }

  public getNotifications = () => this.notifications.asObservable();

  private initWsService() {
    this.organizationService
      .getUserOrganization().pipe(first()).subscribe((o) => {
        if (o) this.initWsNotifications();
        else { timer(60000).subscribe(() => location.reload()) }
      })
  }

  private initWsNotifications() {
    const address = this.findWebsocketAddress();
    if (address) {
      this.ws_subject = webSocket({
        url: address,
        deserializer: msg => msg.data,
        openObserver: {
          next: () => {
            if (this.timeOutIteration) console.log("Websocket connected");
            this.timeOutIteration = 0;
          }
        },
        closeObserver: {
          next: (closeEvent) => {
            const timeout = this.getTimeout(this.timeOutIteration);
            timer(timeout).subscribe(() => { this.timeOutIteration++; this.initWsNotifications(); })
          }
        }
      });
      this.ws_subject.subscribe(
        msg => this.handleWebsocketNotificationMessage(msg),
        err => this.handleError(err),
        () => this.handleWsClosed()
      );
    }
  }

  private handleError(err) {
    console.log("error", err)
  }

  private handleWsClosed() {
    console.log('ws closed')
  }

  private findWebsocketAddress() {
    let address = window.location.protocol == 'https:' ? 'wss:' : 'ws:';
    address += '//' + window.location.host + '/notify/ws';
    return address; //'ws://localhost:4455/notify/ws'
  }

  private handleWebsocketNotificationMessage(msg: string) {
    if (NotificationService.registedNotificationListeners.size == 0) return;
    if (msg.includes("\n")) {
      msg.split("\n").forEach(element => this.handleWebsocketNotificationMessage(element));
      return;
    }


    const msgParts = msg.split(":");
    const projectId = msgParts[0];
    if (!NotificationService.registedNotificationListeners.has(projectId)) return;

    NotificationService.registedNotificationListeners.get(projectId).forEach((params, key) => {
      if (!params.whitelist || params.whitelist.includes(msgParts[1])) {
        params.func.call(key, msgParts);
      }
    });

  }

  public static subscribeToNotification(key: Object, params: NotificationSubscription) {
    if (!params.projectId) params.projectId = "GLOBAL";
    if (!NotificationService.registedNotificationListeners.has(params.projectId)) {
      NotificationService.registedNotificationListeners.set(params.projectId, new Map<Object, NotificationSubscription>());
    }
    const innerMap = NotificationService.registedNotificationListeners.get(params.projectId);
    innerMap.set(key, params);
  }

  public static unsubscribeFromNotification(key: Object, projectId: string = null) {
    if (!projectId) projectId = "GLOBAL"
    if (NotificationService.registedNotificationListeners.has(projectId)) {
      NotificationService.registedNotificationListeners.get(projectId).delete(key);
    }
  }

  private getTimeout(iteration: number): number {
    if (iteration <= 0) return 1000;
    else {
      switch (iteration) {
        case 1: return 2000;
        case 2: return 5000;
        case 3: return 15000;
        case 4: return 30000;
        case 5: return 60000;
        default:
          return 60 * 5 * 1000; //5 min
      }
    }
  }
}
