import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { NotificationType } from 'aws-sdk/clients/budgets';
import { map } from 'rxjs/operators';
import { mutations } from './notification-mutations';
import { queries } from './notification-queries';

@Injectable({
  providedIn: 'root',
})
export class NotificationApolloService {
  constructor(private apollo: Apollo) { }

  getNotificationsByUser() {
    const query = this.apollo
      .watchQuery({
        query: queries.NOTIFICATIONS_BY_USER,
        fetchPolicy: 'no-cache',
      });
    const vc = query.valueChanges.pipe(
      map((result) =>
        result['data']['notificationsByUserId']
      )
    );
    return [query, vc];

  }
  getNotifications() {
    const query = this.apollo
      .watchQuery({
        query: queries.NOTIFICATIONS,
        fetchPolicy: 'network-only',
      });
    const vc = query
      .valueChanges.pipe(
        map((result) =>
          result['data']['notifications'].map((wrapper) => wrapper)
        )
      );
    return [query, vc];
  }

  createNotification(projectId: string, message: string) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_NOTIFICATION,
      variables: {
        message: message,
        projectId: projectId,

      },
    });
  }
}
