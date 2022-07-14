import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { mutations } from './config-mutations';
import { queries } from './config-queries';


@Injectable({
  providedIn: 'root'
})
export class ConfigApolloService {

  constructor(private apollo: Apollo) { }

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
}
