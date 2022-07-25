import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';
import { mutations } from './knowledge-bases-mutations';
import { queries } from './knowledge-bases-queries';
import { map } from 'rxjs/operators';
import { ApolloChecker } from '../base/apollo-checker';

@Injectable({
  providedIn: 'root',
})
export class KnowledgeBasesApolloService {
  private apollo: ApolloChecker;
  constructor(private apolloBase: Apollo) { this.apollo = new ApolloChecker(this.apolloBase); }

  createKnowledgeBase(projectId: string) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_KNOWLEDGE_BASE,
      variables: {
        projectId: projectId,
      },
      refetchQueries: [
        {
          query: queries.KNOWLEDGE_BASE_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  addTermToKnowledgeBase(
    projectId: string,
    value: string,
    comment: string,
    knowledgeBaseId: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.ADD_TERM_TO_KNOWLEDGE_BASE,
      variables: {
        projectId: projectId,
        value: value,
        comment: comment,
        knowledgeBaseId: knowledgeBaseId,
      },
      refetchQueries: [
        {
          query: queries.TERMS_BY_KNOWLEDGE_BASE_ID,
          variables: {
            projectId: projectId,
            knowledgeBaseId: knowledgeBaseId,
          },
        },
      ],
    });
  }

  blacklistTerm(projectId: string, knowledgeBaseId: string, termId: string) {
    return this.apollo.mutate({
      mutation: mutations.BLACKLIST_TERM,
      variables: {
        projectId: projectId,
        termId: termId,
      },
      refetchQueries: [
        {
          query: queries.TERMS_BY_KNOWLEDGE_BASE_ID,
          variables: {
            projectId: projectId,
            knowledgeBaseId: knowledgeBaseId,
          },
        },
      ],
    });
  }

  deleteKnowledgeBase(projectId: string, knowledgeBaseId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_KNOWLEDGE_BASE,
      variables: {
        projectId: projectId,
        knowledgeBaseId: knowledgeBaseId,
      },
      refetchQueries: [
        {
          query: queries.KNOWLEDGE_BASE_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  deleteTerm(projectId: string, knowledgeBaseId: string, termId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_TERM,
      variables: {
        projectId: projectId,
        termId: termId,
      },
      refetchQueries: [
        {
          query: queries.TERMS_BY_KNOWLEDGE_BASE_ID,
          variables: {
            projectId: projectId,
            knowledgeBaseId: knowledgeBaseId,
          },
        },
      ],
    });
  }

  updateTerm(
    projectId: string,
    knowledgeBaseId: string,
    termId: string,
    value: string,
    comment: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_TERM,
      variables: {
        projectId: projectId,
        termId: termId,
        value: value,
        comment: comment,
      },
      refetchQueries: [
        {
          query: queries.TERMS_BY_KNOWLEDGE_BASE_ID,
          variables: {
            projectId: projectId,
            knowledgeBaseId: knowledgeBaseId,
          },
        },
      ],
    });
  }
  pasteTerm(
    projectId: string,
    knowledgeBaseId: string,
    values: string,
    split: string,
    asDelete: boolean
  ) {
    return this.apollo.mutate({
      mutation: mutations.PASTE_TERM,
      variables: {
        projectId: projectId,
        knowledgeBaseId: knowledgeBaseId,
        values: values,
        split: split,
        delete: asDelete
      }
    });
  }

  updateKnowledgeBase(
    projectId: string,
    knowledgeBaseId: string,
    name: string,
    description: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_KNOWLEDGE_BASE,
      variables: {
        projectId: projectId,
        knowledgeBaseId: knowledgeBaseId,
        name: name,
        description: description,
      },
      refetchQueries: [
        {
          query: queries.KNOWLEDGE_BASE_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.KNOWLEDGE_BASE_BY_KNOWLEDGE_BASE_ID,
          variables: {
            projectId: projectId,
            knowledgeBaseId: knowledgeBaseId,
          },
        },
      ],
    });
  }

  getKnowledgeBasesByProjectId(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.KNOWLEDGE_BASE_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'network-only', // Used for first execution
        nextFetchPolicy: 'cache-first', // Used for subsequent executions (refetch query updates the cache != triggers the function)
      });
    const vc = query.valueChanges.pipe(
      map((result) => result['data']['knowledgeBasesByProjectId'])
    );
    return [query, vc]
  }

  getTermsByKnowledgeBaseId(projectId: string, knowledgeBaseId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.TERMS_BY_KNOWLEDGE_BASE_ID,
        variables: {
          projectId: projectId,
          knowledgeBaseId: knowledgeBaseId,
        },
        fetchPolicy: 'cache-and-network', // Used for first execution
      });
    const vc = query
      .valueChanges.pipe(
        map((result) =>
          result['data']['termsByKnowledgeBaseId'].map((wrapper) => wrapper)
        )
      );
    return [query, vc];
  }

  getKnowledgeBaseByKnowledgeBaseId(projectId: string, knowledgeBaseId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.KNOWLEDGE_BASE_BY_KNOWLEDGE_BASE_ID,
        variables: {
          projectId: projectId,
          knowledgeBaseId: knowledgeBaseId,
        },
        fetchPolicy: 'network-only', // Used for first execution
        nextFetchPolicy: 'cache-first', // Used for subsequent executions (refetch query updates the cache != triggers the function)   
      });
    const vc = query
      .valueChanges.pipe(
        map((result) => result['data']['knowledgeBaseByKnowledgeBaseId'])
      );
    return [query, vc];
  }

  exportList(projectId: string, listId: string) {
    return this.apollo.mutate({
      mutation: queries.EXPORT_LIST,
      variables: {
        projectId: projectId,
        listId: listId,
      },
      fetchPolicy: 'no-cache',
    }).pipe(map((result) => result['data']['exportKnowledgeBase']));
  }
}
