import { Injectable } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { queries } from './record-queries';
import { mutations } from './record-mutations';
import { queries as projectQueries } from '../project/project-queries';
import { ApolloChecker } from '../base/apollo-checker';
import { countOccurrences } from 'submodules/javascript-functions/general';

@Injectable({
  providedIn: 'root',
})
export class RecordApolloService {
  topN: number = 1;
  private apollo: ApolloChecker;
  constructor(private apolloBase: Apollo) { this.apollo = new ApolloChecker(this.apolloBase); }

  recordsListQuery: QueryRef<any>;
  static recordsCursor: string;
  static hasNextPage: boolean;
  static cursorBefore: string;

  //For search pagination:
  searchQuery: QueryRef<any>;
  static searchHasNextPage: boolean;
  static searchRecordsCursor: number;
  static searchCursorBefore: number;

  runRecordIDE(projectId, recordId, code) {
    return this.apollo
      .query({
        query: queries.RUN_RECORD_IDE,
        variables: {
          projectId: projectId,
          recordId: recordId,
          code: code
        },
      }).pipe(map((result) => result));
  }


  deleteRecordByRecordId(projectId, recordId): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.DELETE_RECORD_BY_RECORD_ID,
      variables: {
        projectId: projectId,
        recordId: recordId,
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  getNextRecordId(projectId, accessStrategy) {
    return this.apollo
      .watchQuery({
        query: queries.GET_NEXT_RECORD_ID,
        variables: {
          projectId: projectId,
          accessStrategy: accessStrategy,
        },
        fetchPolicy: 'network-only', // Used for first execution
        nextFetchPolicy: 'cache-first', // Used for subsequent executions (refetch query updates the cache != triggers the function)
      })
      .valueChanges.pipe(
        map((result) => {
          const record = result['data']['nextRecord'];
          if (!record) return { id: null };
          return { id: record.id };
        })
      );
  }

  getRecordByRecordId(projectId, recordId): Observable<any> {
    return this.apollo
      .watchQuery({
        query: queries.GET_RECORD_BY_RECORD_ID,
        variables: {
          projectId: projectId,
          recordId: recordId,
        },
      })
      .valueChanges.pipe(
        map((result) => {
          const record = result['data']['recordByRecordId'];
          if (!record) return null;
          return {
            id: record.id,
            data: JSON.parse(record.data),
            projectId: record.projectId,
            category: record.category,
          };
        })
      );
  }
  getRecordLabelAssociations(projectId, recordId) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
        variables: {
          projectId: projectId,
          recordId: recordId,
        },
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        const rlas = result['data']?.['recordByRecordId']?.['recordLabelAssociations'];
        if (!rlas) return null;
        return rlas['edges'].map((edge) => edge['node']);

      }));
    return [query, vc]
  }

  setGoldStarAnnotationForTask(
    projectId: string,
    recordId: string,
    labelingTaskId: string,
    goldUserId: string
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.SET_GOLD_STAR_ANNOTATION_FOR_TASK,
      variables: {
        projectId: projectId,
        recordId: recordId,
        labelingTaskId: labelingTaskId,
        goldUserId: goldUserId,
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
          variables: {
            projectId: projectId,
            recordId: recordId,
          },
        },
      ],
    });
  }

  removeGoldStarAnnotationForTask(
    projectId: string,
    recordId: string,
    labelingTaskId: string,
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.REMOVE_GOLD_STAR_ANNOTATION_FOR_TASK,
      variables: {
        projectId: projectId,
        recordId: recordId,
        labelingTaskId: labelingTaskId,
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
          variables: {
            projectId: projectId,
            recordId: recordId,
          },
        },
      ],
    });
  }

  addClassificationLabelsToRecord(
    projectId: string,
    recordId: string,
    labelingTaskId: string,
    labelId: string,
    asGoldStar: boolean = null,
    sourceId: string = null,
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.ADD_CLASSIFICATION_LABELS_TO_RECORD,
      variables: {
        projectId: projectId,
        recordId: recordId,
        labelingTaskId: labelingTaskId,
        labelId: labelId,
        asGoldStar: asGoldStar,
        sourceId: sourceId
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
          variables: {
            projectId: projectId,
            recordId: recordId,
          },
        },
      ],
    });
  }

  addExtractionLabelToRecord(
    projectId: string,
    recordId: string,
    labelingTaskId: string,
    startIdx: number,
    endIdx: number,
    value: string,
    labelId: string,
    asGoldStar: boolean = null,
    sourceId: string = null,
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.ADD_EXTRACTION_LABEL_TO_RECORD,
      variables: {
        projectId: projectId,
        recordId: recordId,
        labelingTaskId: labelingTaskId,
        tokenStartIndex: startIdx,
        tokenEndIndex: endIdx,
        value: value,
        labelId: labelId,
        asGoldStar: asGoldStar,
        sourceId: sourceId,
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
          variables: {
            projectId: projectId,
            recordId: recordId,
          },
        },
      ],
    });
  }

  deleteRecordLabelAssociationById(
    projectId: string,
    recordId: string,
    associationIds: string[]
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.DELETE_RECORD_LABEL_ASSOCIATION_BY_ID,
      variables: {
        projectId: projectId,
        recordId: recordId,
        associationIds: associationIds,
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
          variables: {
            projectId: projectId,
            recordId: recordId,
          },
        },
      ],
    });
  }

  changeRecordLabelAssociationComment(
    projectId: string,
    recordId: string,
    associationId: string,
    comment: string
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.CHANGE_RECORD_LABEL_ASSOCIATION_COMMENT,
      variables: {
        projectId: projectId,
        recordId: recordId,
        associationId: associationId,
        comment: comment,
      },
      refetchQueries: [
        {
          query: projectQueries.GET_PROJECT_BY_ID,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_RECORD_LABEL_ASSOCIATIONS,
          variables: {
            projectId: projectId,
            recordId: recordId,
          },
        },
      ],
    });
  }

  skipLabelingRecord(projectId, recordId, accessStrategy): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.SKIP_LABELING_RECORD,
      variables: {
        projectId: projectId,
        recordId: recordId,
        accessStrategy: accessStrategy,
      },
      refetchQueries: [
        {
          query: queries.GET_NEXT_RECORD_ID,
          variables: {
            projectId: projectId,
            accessStrategy: accessStrategy,
          },
        },
      ],
    });
  }

  uploadEmbeddings(projectId: string, records: string[]): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.UPLOAD_EMBEDDINGS,
      variables: {
        projectId: projectId,
        data: records,
      },
    });
  }

  uploadLabels(projectId: string, records: string[]): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.UPLOAD_LABELS,
      variables: {
        projectId: projectId,
        data: records,
      },
    });
  }

  createRecords(
    projectId: string,
    records: string[],
    category: string
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.UPLOAD_FILE,
      variables: {
        projectId: projectId,
        data: records,
        category: category,
      },
    });
  }

  getRecordSearchApolloQuery(
    projectId: string,
    queryText: string,
    manual: string[],
    programmatic: string[],
    category: string[],
    fieldToQuery: string[],
    offset: number,
    limit: number
  ): QueryRef<any> {
    return this.apollo.watchQuery<any>({
      query: queries.SEARCH_RECORDS_NEW,
      variables: {
        projectId: projectId,
        fieldToQuery: fieldToQuery,
        queryText: queryText,
        manual: manual,
        programmatic: programmatic,
        category: category,
        offset: 0,
        limit: limit,
      },
      fetchPolicy: 'network-only',
    });
  }


  getSessionBySessionId(projectId: string, sessionId: string) {
    return this.apollo
      .query({
        query: queries.GET_SESSION_BY_SESSION_ID,
        variables: {
          projectId: projectId,
          sessionId: sessionId,
        },
        fetchPolicy: "network-only",
      }).pipe(
        map((result) => {
          const data = result['data']['userSessionBySessionId'];
          return {
            sessionRecordIds: JSON.parse(data.sessionRecordIds),
            sessionId: data.id
          };
        })
      );
  }

  getRecordSearchAdvanced(
    variables: { projectId: string, filterData: string[], offset: number, limit: number }
  ) {
    return this.apollo.query({
      query: queries.SEARCH_RECORDS_EXTENDED,
      variables: variables,
      fetchPolicy: 'no-cache',
    }).pipe(
      map((result) => {
        return result['data']['searchRecordsExtended'];
      })
    );
  }


  getSimilarRecords(
    variables: {
      projectId: string,
      embeddingId: string,
      recordId: string,
    }
  ): any {
    return this.apollo.query({
      query: queries.SEARCH_SIMILAR_RECORDS,
      variables: variables,
      fetchPolicy: 'no-cache',
    }).pipe(
      map((result) => {
        return result['data']['searchRecordsBySimilarity'];
      })
    );
  }

  isAnyRecordManuallyLabeled(projectId: string): any {
    return this.apollo.query({
      query: queries.IS_ANY_RECORD_MANUALLY_LABELED,
      variables: {
        projectId: projectId,
      },
      fetchPolicy: 'no-cache',
    }).pipe(
      map((result) => {
        return result['data']['isAnyRecordManuallyLabeled'];
      })
    );
  }

  getRecordsByStaticSlice(
    variables: { projectId: string, sliceId: string, orderBy: string, offset: number, limit: number }
  ): any {
    return this.apollo.query({
      query: queries.GET_RECORDS_BY_STATIC_SLICE,
      variables: variables,
      fetchPolicy: 'no-cache',
    }).pipe(
      map((result) => {
        return result['data']['recordsByStaticSlice'];
      })
    );
  }

  getStaticDataSliceCurrentCount(projectId: string, sliceId: string) {
    return this.apollo
      .query({
        query: queries.GET_STATIC_DATA_SLICE_CURRENT_COUNT,
        variables: {
          projectId: projectId,
          sliceId: sliceId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          return result['data']['staticDataSlicesCurrentCount'];
        })
      );
  }

  getTokenizedRecord(recordId: string) {
    return this.apollo
      .query({
        query: queries.GET_TOKENIZED_RECORD,
        variables: {
          recordId: recordId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          const data = result['data']['tokenizeRecord'];
          if (!data) return null;
          return this.#addDiffToNext({
            recordId: data.recordId,
            attributes: data.attributes.map((attribute) => {
              return {
                raw: attribute.raw,
                attributeId: attribute.attribute.id,
                attributeName: attribute.attribute.name,
                token: !attribute.tokens
                  ? null
                  : attribute.tokens.map(this.#tokenMapper, attribute.tokens.length - 1),
              };
            }),
          });
        })
      );
  }

  //private
  #tokenMapper(token: any, lastIdx: number) {
    let countLineBreaks = countOccurrences(token.value, "\n");
    if (countLineBreaks > 0) {
      // If we are on the first or last token and either/both of them is new lines, the class w-full cannot work because we don't have a previous or next token, that's why we need the original countLineBreaks
      // If we are not on the first or last token, the array of the countLineBreaks has to be one less than the actual countLineBreaks because we use the class w-full of the current line as one line break
      // Adding a completely new line and having a text that needs a new line are different in terms of css classes
      const checkIfOrLastIdx = token.idx == 0 || token.idx == lastIdx;
      countLineBreaks = checkIfOrLastIdx ? countLineBreaks : countLineBreaks - 1;
    }
    return {
      value: token.value,
      idx: token.idx,
      posStart: token.posStart,
      posEnd: token.posEnd,
      type: token.type,
      countLineBreaks: countLineBreaks,
      countLineBreaksArray: countLineBreaks != 0 ? Array(countLineBreaks - 1) : null, // we need an array if we have a countLineBreaks so we can loop through it in the template and create the new lines
    };
  }
  #addDiffToNext(tokenObj) {
    for (let a of tokenObj.attributes) {
      if (a.token) {
        for (let i = 0; i < a.token.length - 1; i++) {
          a.token[i].nextCloser = a.token[i].posEnd == a.token[i + 1].posStart;
        }
      }
    }

    return tokenObj;
  }
}
