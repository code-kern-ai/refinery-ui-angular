

import { Apollo } from 'apollo-angular';
import { QueryOptions, MutationOptions, ApolloQueryResult, FetchResult } from '@apollo/client/core';
import { EmptyObject, WatchQueryOptions } from 'apollo-angular/types';
import { Observable } from 'rxjs';
import { QueryRef } from 'apollo-angular/query-ref';
import { DemoError } from '../../interceptors/DemoError';
import { ConfigManager } from '../config-service';

export class ApolloChecker {

    public apollo: Apollo;
    constructor(apollo: Apollo) {
        this.apollo = apollo;
    }

    mutate<T, V = EmptyObject>(options: MutationOptions<T, V>): Observable<FetchResult<T>> {
        ApolloChecker.checkBlackWhiteList("mutation", options.mutation.loc?.source.body);
        return this.apollo.mutate(options)
    }
    watchQuery<TData, TVariables = EmptyObject>(options: WatchQueryOptions<TVariables, TData>): QueryRef<TData, TVariables> {
        ApolloChecker.checkBlackWhiteList("query", options.query.loc?.source.body);
        return this.apollo.watchQuery(options);
    }
    query<T, V = EmptyObject>(options: QueryOptions<V, T>): Observable<ApolloQueryResult<T>> {
        ApolloChecker.checkBlackWhiteList("query", options.query.loc?.source.body);
        return this.apollo.query(options);
    }

    private static checkBlackWhiteList(type: string, queryText: string) {
        if (!ConfigManager.getIsDemo(true)) return;
        if (ConfigManager.getIsAdmin(true)) return;
        if (!queryText) throw new Error("Can't find query text");
        if (!ConfigManager.checkBlackWhiteList(type, queryText)) throw new DemoError(type, queryText);
    }
}