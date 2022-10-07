import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { parseLogData } from 'src/app/util/helper-functions';
import { InformationSourceType, informationSourceTypeToString, LabelSource } from '../../enum/graphql-enums';
import { ApolloChecker } from '../base/apollo-checker';
import { mutations } from './weak-source-mutations';
import { queries } from './weak-source-queries';

@Injectable({
  providedIn: 'root',
})
export class WeakSourceApolloService {
  private apollo: ApolloChecker;
  constructor(private apolloBase: Apollo) { this.apollo = new ApolloChecker(this.apolloBase); }

  createTask(projectId: string, informationSourceId: string) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_INFORMATION_SOURCE_PAYLOAD,
      variables: {
        projectId: projectId,
        informationSourceId: informationSourceId,
      },
    });
  }

  deleteInformationSource(projectId: string, labelFunctionId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_INFORMATION_SOURCE,
      variables: {
        projectId: projectId,
        informationSourceId: labelFunctionId,
      },
      refetchQueries: [
        {
          query: queries.GET_INFORMATION_SOURCE_OVERVIEW_DATA,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }


  createInformationSource(
    projectId: string,
    labelingTaskId: string,
    name: string,
    description: string,
    functionText: string,
    type: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_INFORMATION_SOURCE,
      variables: {
        projectId: projectId,
        labelingTaskId: labelingTaskId,
        sourceCode: functionText,
        name: name,
        description: description,
        type: type,
      },
      refetchQueries: [
        {
          query: queries.GET_INFORMATION_SOURCE_OVERVIEW_DATA,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  createZeroShotInformationSource(projectId: string, targetConfig: string, labelingTaskId: string, attributeId: string) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_ZERO_SHOT_INFORMATION_SOURCE,
      variables: {
        projectId: projectId,
        targetConfig: targetConfig,
        labelingTaskId: labelingTaskId,
        attributeId: attributeId,
      },
      refetchQueries: [
        {
          query: queries.GET_INFORMATION_SOURCE_OVERVIEW_DATA,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  getZeroShotRecommendations(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_ZERO_SHOT_RECOMMENDATIONS,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'cache-first'
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        if (result['data']['zeroShotRecommendations']) {
          return JSON.parse(result['data']['zeroShotRecommendations']);
        }
        return null;
      }));
    return [query, vc];
  }

  getZeroShotText(projectId: string, informationSourceId: string, config: string, text: string, runIndividually: boolean, labels: string) {
    return this.apollo
      .query({
        query: queries.GET_ZERO_SHOT_TEXT,
        variables: {
          projectId: projectId,
          informationSourceId: informationSourceId,
          config: config,
          text: text,
          runIndividually: runIndividually,
          labels: labels,
        },
        fetchPolicy: 'no-cache'
      }).pipe(
        map((result) => result['data']['zeroShotText']));
  }
  getZeroShot10RandomRecords(projectId: string, informationSourceId: string, labels: string) {
    return this.apollo
      .query({
        query: queries.GET_ZERO_SHOT_10_RANDOM_RECORDS,
        variables: {
          projectId: projectId,
          informationSourceId: informationSourceId,
          labels: labels,
        },
        fetchPolicy: 'no-cache'
      }).pipe(
        map((result) => result['data']['zeroShot10Records']));
  }

  runZeroShotProject(projectId: string, informationSourceId: string) {
    return this.apollo.mutate({
      mutation: mutations.RUN_ZERO_SHOT_PROJECT,
      variables: {
        projectId: projectId,
        informationSourceId: informationSourceId,
      }
    });
  }

  getInformationSourcesOverviewData(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_INFORMATION_SOURCE_OVERVIEW_DATA,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'no-cache'
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        let tmp = result['data']['informationSourcesOverviewData'];
        if (!tmp) return [];
        return JSON.parse(tmp).map((source) => {
          source.labelSource = LabelSource.INFORMATION_SOURCE;
          source.stats = this.mapInformationSourceStatsGlobal(source.stat_data);
          return source;
        });
      })

    );
    return [query, vc];
  }

  getModelCallbacksOverviewData(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_MODEL_CALLBACKS_OVERVIEW_DATA,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'cache-and-network'
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        let tmp = result['data']['modelCallbacksOverviewData'];
        if (!tmp) return [];
        return JSON.parse(tmp).map((source) => {
          source.labelSource = LabelSource.INFORMATION_SOURCE;
          source.stats = this.mapInformationSourceStatsGlobal(source.stat_data);
          return source;
        });
      })

    );
    return [query, vc];
  }

  private mapInformationSourceStatsGlobal(data) {
    if (data?.length) {
      return data.map((wrapper) => {
        return this.convertStatDataGlobal(wrapper)
      })
    } else {
      return [this.convertStatDataGlobal()];
    }
  }
  private convertStatDataGlobal(data = null) {
    return {
      label: !data ? '-' : data.label,
      color: !data ? '-' : data.color,
      labelId: !data ? '-' : data.labelId,
      values: {
        'TruePositives': !data ? '-' : data.true_positives,
        'FalsePositives': !data ? '-' : data.false_positives,
        'FalseNegatives': !data ? '-' : data.false_negatives,
        'Precision': !data ? '-' : this.getPrecision(data.true_positives, data.false_positives),
        'Recall': !data ? '-' : this.getRecall(data.true_positives, data.false_negatives),
        Coverage: !data ? '-' : data.record_coverage,
        TotalHits: !data ? '-' : data.total_hits,
        Conflicts: !data ? '-' : data.source_conflicts,
        Overlaps: !data ? '-' : data.source_overlaps,
      },
    }
  }



  private getPrecision(tp: number, fp: number): number {
    if (tp + fp == 0) {
      return 0;
    } else {
      return tp / (tp + fp);
    }
  }

  private getRecall(tp: number, fn: number): number {
    if (tp + fn == 0) {
      return 0;
    } else {
      return tp / (tp + fn);
    }
  }

  getInformationSourceBySourceId(
    projectId: string,
    informationSourceId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_INFORMATION_SOURCE_BY_SOURCE_ID,
        variables: {
          projectId: projectId,
          informationSourceId: informationSourceId,
        },
        fetchPolicy: 'no-cache',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        let informationSource = result['data']['informationSourceBySourceId'];
        // TODO: this pretty ugly and has to be updated all the time. better way?
        return {
          id: informationSource['id'],
          labelSource: LabelSource.INFORMATION_SOURCE,
          informationSourceType: InformationSourceType[informationSource['type']],
          name: informationSource['name'],
          description: informationSource['description'],
          selected: informationSource['isSelected'],
          sourceCode: informationSource['sourceCode'],
          labelingTaskId: informationSource['labelingTaskId'],
          stats: this.mapInformationSourceStats(informationSource['sourceStatistics']['edges']),
          lastTask: informationSource['lastPayload'],
          returnType: informationSource['returnType']
        };
      })
    );

    return [query, vc];
  }
  private mapInformationSourceStats(edges) {
    if (edges.length) {
      return edges.map((wrapper) => {
        return this.convertStatData(wrapper['node'])
      })
    } else {
      return [this.convertStatData()];
    }
  }

  private convertStatData(data = null) {
    return {
      label: !data ? '-' : data['labelingTaskLabel']['name'],
      color: !data ? '-' : data['labelingTaskLabel']['color'],
      labelId: !data ? '-' : data['labelingTaskLabel']['id'],
      values: {
        'TruePositives': !data ? '-' : data['truePositives'],
        'FalsePositives': !data ? '-' : data['falsePositives'],
        'FalseNegatives': !data ? '-' : data['falseNegatives'],
        'Precision': !data ? '-' : this.getPrecision(data['truePositives'], data['falsePositives']),
        'Recall': !data ? '-' : this.getRecall(data['truePositives'], data['falseNegatives']),
        Coverage: !data ? '-' : data['recordCoverage'],
        TotalHits: !data ? '-' : data['totalHits'],
        Conflicts: !data ? '-' : data['sourceConflicts'],
        Overlaps: !data ? '-' : data['sourceOverlaps'],
      },
    }
  }
  getTaskByTaskId(projectId: string, taskId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_TASK_BY_TASK_ID,
        variables: {
          projectId: projectId,
          payloadId: taskId,
        },
        fetchPolicy: 'no-cache',
      });
    const vc = query
      .valueChanges.pipe(
        map((result) => {
          const payload = result['data']['payloadByPayloadId'];
          if (payload == null) return null;
          payload.logs = parseLogData(payload['logs'], payload['informationSource']['type']);
          return payload;
        })
      );
    return [query, vc]
  }


  updateInformationSource(
    projectId: string,
    informationSourceId: string,
    labelingTaskId: string,
    code: string,
    description: string,
    name: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_INFORMATION_SOURCE,
      variables: {
        projectId: projectId,
        informationSourceId: informationSourceId,
        labelingTaskId: labelingTaskId,
        code: code,
        description: description,
        name: name,
      },
      refetchQueries: [
        {
          query: queries.GET_INFORMATION_SOURCE_OVERVIEW_DATA,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_INFORMATION_SOURCE_BY_SOURCE_ID,
          variables: {
            projectId: projectId,
            informationSourceId: informationSourceId,
          },
        },
      ],
    });
  }

  toggleInformationSourceSelected(
    projectId: string,
    informationSourceId: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.TOGGLE_INFORMATION_SOURCE_SELECTED,
      variables: {
        informationSourceId: informationSourceId,
        projectId: projectId,
      },
      refetchQueries: [
        {
          query: queries.GET_INFORMATION_SOURCE_OVERVIEW_DATA,
          variables: {
            projectId: projectId,
          },
        },
        {
          query: queries.GET_INFORMATION_SOURCE_BY_SOURCE_ID,
          variables: {
            projectId: projectId,
            informationSourceId: informationSourceId,
          },
        },
      ],
    });
  }

  triggerWeakSupervision(projectId: string) {
    return this.apollo.mutate({
      mutation: mutations.INITIATE_WEAK_SUPERVISIONS,
      variables: {
        projectId: projectId,
      },
    });
  }

  runHeuristicThenTriggerWeakSupervision(
    projectId: string, informationSourceId: string, labelingTaskId: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.RUN_HEURISTIC_THEN_TRIGGER_WEAK_SUPERVISION,
      variables: {
        projectId: projectId,
        informationSourceId: informationSourceId,
        labelingTaskId: labelingTaskId,
      },
    });
  }

  setAllInformationSources(projectId: string, value: boolean) {
    return this.apollo.mutate({
      mutation: mutations.SET_ALL_INFORMATION_SOURCES,
      variables: {
        projectId: projectId,
        value: value
      },
    });
  }

  setAllModelCallbacks(projectId: string, value: boolean) {
    return this.apollo.mutate({
      mutation: mutations.SET_ALL_MODEL_CALLBACKS,
      variables: {
        projectId: projectId,
        value: value
      },
    });
  }

  getModelProviderInfo() {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_MODEL_PROVIDER_INFO,
        fetchPolicy: 'network-only', // Used for first execution
        nextFetchPolicy: 'cache-first', // Used for subsequent executions (refetch query updates the cache != triggers the function)
      });
    const vc = query.valueChanges.pipe(
      map((result) => result['data']['modelProviderInfo'])
    );
    return [query, vc]
  }

  downloadModel(name: string) {
    return this.apollo.mutate({
      mutation: mutations.MODEL_PROVIDER_DOWNLOAD_MODEL,
      variables: {
        modelName: name
      }
    });
  }

  deleteModel(name: string) {
    return this.apollo.mutate({
      mutation: mutations.MODEL_PROVIDER_DELETE_MODEL,
      variables: {
        modelName: name
      },
      refetchQueries: [
        {
          query: queries.GET_MODEL_PROVIDER_INFO
        },
      ],
    });
  }

  getLabelingFunctionOn10Records(projectId: string, informationSourceId: string) {
    return this.apollo
      .query({
        query: queries.GET_LABELING_FUNCTION_ON_10_RECORDS,
        variables: {
          projectId: projectId,
          informationSourceId: informationSourceId
        },
        fetchPolicy: 'no-cache'
      }).pipe(
        map((result) => {
          const lfRun = result['data']['getLabelingFunctionOn10Records'];
          if (lfRun == null) return null;
          return {
            records: lfRun['records'].map((record, index) => {
              return {
                calculatedLabels: record['calculatedLabels'],
                fullRecordData: record['fullRecordData'],
                recordId: record['recordId']
              }
            }),
            codeHasErrors: lfRun['codeHasErrors'],
            containerLogs: parseLogData(lfRun['containerLogs'], InformationSourceType.LABELING_FUNCTION)
          };
        })
      );
  }

}
