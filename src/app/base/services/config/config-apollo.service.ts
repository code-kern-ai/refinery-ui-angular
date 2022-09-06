import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApolloChecker } from '../base/apollo-checker';
import { mutations } from './config-mutations';
import { queries } from './config-queries';


@Injectable({
  providedIn: 'root'
})
export class ConfigApolloService {

  private apollo: ApolloChecker;
  constructor(private apolloBase: Apollo) { this.apollo = new ApolloChecker(this.apolloBase); }

  isManaged() {
    return this.apollo
      .query({
        query: queries.IS_MANAGED,
        fetchPolicy: 'no-cache',
      })
      .pipe(map((result) => result['data']['isManaged'] != false));
  }

  updateConfig(dictStr: string): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_CONFIG,
      variables: {
        dictStr: dictStr,
      }
    });
  }

  isDemo() {
    return this.apollo
      .query({
        query: queries.IS_DEMO,
        fetchPolicy: 'cache-first',
      })
      .pipe(map((result) => result['data']['isDemo'] != false));
  }

  isAdmin() {
    return this.apollo
      .query({
        query: queries.IS_AMDIN,
        fetchPolicy: 'no-cache',
      })
      .pipe(map((result) => result['data']['isAdmin'] != false));
  }

  getBlackWhiteDemo() {
    return this.apollo
      .query({
        query: queries.GET_BLACK_WHITE_DEMO,
        fetchPolicy: 'cache-first',
      })
      .pipe(map((result) => JSON.parse(result['data']['getBlackWhiteDemo'])));
  }

  getVersionOverview() {
    return this.apollo
      .query({
        query: queries.GET_VERSION_OVERVIEW,
        fetchPolicy: 'no-cache',
      })
      .pipe(map((result) => result['data']['versionOverview']));
  }

  hasUpdates() {
    return this.apollo
      .query({
        query: queries.GET_HAS_UPDATES,
        fetchPolicy: 'no-cache',
      })
      .pipe(map((result) => result['data']['hasUpdates']));
  }

}
