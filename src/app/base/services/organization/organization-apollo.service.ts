import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Organization } from '../../entities/organization';
import { ApolloChecker } from '../base/apollo-checker';
import { mutations } from './organization-mutations';
import { queries } from './organization-queries';


@Injectable({
  providedIn: 'root'
})
export class OrganizationApolloService {

  private apollo: ApolloChecker;
  constructor(private apolloBase: Apollo) { this.apollo = new ApolloChecker(this.apolloBase); }

  createOrganization(name: string) {
    return this.apollo
      .mutate({
        mutation: mutations.CREATE_ORGANIZATION,
        variables: {
          name: name,
        },
      })
      .pipe(map((result) => result['data']['createOrganization']));
  }

  addUserToOrganization(userMail: string, organizationName: string) {
    return this.apollo
      .mutate({
        mutation: mutations.ADD_USER_TO_ORGANIZATION,
        variables: {
          userMail: userMail,
          organizationName: organizationName,
        },
      })
      .pipe(map((result) => result['data']['addUserToOrganization']));
  }

  getUserOrganization(): Observable<Organization> {
    return this.apollo
      .query({
        query: queries.GET_ORGANIZATION,
      })
      .pipe(map((result) => result['data']['userOrganization']));
  }

  getUserInfo() {
    return this.apollo
      .query({
        query: queries.GET_USER_INFO,
      })
      .pipe(map((result) => result['data']['userInfo']));
  }

  getOrganizationUsers(userRole: string = null) {
    return this.apollo
      .query({
        query: queries.GET_ORGANIZATION_USERS,
        variables: {
          userRole: userRole
        }
      })
      .pipe(map((result) => result['data']['allUsers']));
  }

  getOrganizationUsersWithCount(projectId: string) {
    return this.apollo
      .query({
        query: queries.GET_ORGANIZATION_USERS_WITH_COUNT,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(map((result) => result['data']['allUsersWithRecordCount'].map(data => {
        return {
          user: data.user,
          counts: data.counts ? JSON.parse(data.counts) : null
        };
      })));
  }
  getOverviewStats() {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_OVERVIEW_STATS,
        fetchPolicy: 'cache-and-network',
      });
    const vc = query.valueChanges.pipe(
      map((result) => JSON.parse(result['data']['overviewStats']))
    );
    return [query, vc]
  }

  postEvent(eventName: string, eventData: string) {
    return this.apollo
      .mutate({
        mutation: mutations.POST_EVENT,
        variables: {
          eventName: eventName,
          eventData: eventData,
        },
      })
      .pipe(map((result) => result['data']['postEvent']));
  }

  canCreateLocalOrg() {
    return this.apollo
      .query({
        query: queries.GET_CAN_CREATE_LOCAL_ORG,
      })
      .pipe(map((result) => result['data']['canCreateLocalOrg']));
  }

  requestComments(requestJson: string) {
    return this.apollo
      .query({
        query: queries.REQUEST_COMMENTS,
        variables: {
          requested: requestJson
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(map((result) => JSON.parse(result['data']['getAllComments'])));
  }

  createComment(comment: string, xftype: string, xfkey: string, projectId: string = null, isPrivate: boolean = null) {
    return this.apollo
      .mutate({
        mutation: mutations.CREATE_COMMENT,
        variables: {
          comment: comment,
          xftype: xftype,
          xfkey: xfkey,
          projectId: projectId,
          isPrivate: isPrivate,
        },
      })
      .pipe(map((result) => result['data']['createComment']));
  }


  deleteComment(commentId: string, projectId: string = null) {
    return this.apollo
      .mutate({
        mutation: mutations.DELETE_COMMENT,
        variables: {
          commentId: commentId,
          projectId: projectId,
        },
      })
      .pipe(map((result) => result['data']['deleteComment']));
  }
  updateComment(commentId: string, changesJson: string, projectId: string = null) {
    return this.apollo
      .mutate({
        mutation: mutations.UPDATE_COMMENT,
        variables: {
          commentId: commentId,
          changes: changesJson,
          projectId: projectId,
        },
      })
      .pipe(map((result) => result['data']['updateComment']));
  }

  allProjectIds() {
    return this.apollo
      .query({
        query: queries.PROJECT_IDS,
        fetchPolicy: 'no-cache',
      }).pipe(
        map((result) => {
          return result['data']['allProjects']['edges'].map(
            (wrapper) => wrapper['node']
          );
        })
      );
  }
}
