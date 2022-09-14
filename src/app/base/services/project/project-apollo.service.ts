import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Project } from '../../entities/project';
import { ApolloChecker } from '../base/apollo-checker';
import { mutations } from './project-mutations';
import { queries } from './project-queries';

@Injectable({
  providedIn: 'root',
})
export class ProjectApolloService {
  private apollo: ApolloChecker;
  constructor(private apolloBase: Apollo) { this.apollo = new ApolloChecker(this.apolloBase) }

  createProject(projectName: string, description: string) {
    return this.apollo
      .mutate({
        mutation: mutations.CREATE_PROJECT,
        variables: {
          name: projectName,
          description: description,
        },
      })
      .pipe(map((result) => result['data']['createProject']['project']));
  }

  createSampleProject(projectName: string) {
    return this.apollo
      .mutate({
        mutation: mutations.CREATE_SAMPLE_PROJECT,
        variables: {
          name: projectName,
        },
      })
      .pipe(map((result) => result['data']['createSampleProject']['project']));
  }

  deleteProjectById(projectId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_PROJECT,
      variables: {
        projectId: projectId,
      },
    });
  }

  getProjects() {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_PROJECT_LIST,
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['allProjects']['edges'].map(
          (wrapper) => wrapper['node']
        );
      })
    );
    return [query, vc]
  }
  getProjectNames() {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_PROJECT_NAMES,
        fetchPolicy: 'cache-and-network',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['allProjects']['edges'].map(
          (wrapper) => wrapper['node']
        );
      })
    );
    return [query, vc]
  }

  getProjectStatistics(id: string, onlyScale = false) {
    const graphql_query = onlyScale ? queries.GET_SCALE_PROJECT_STATISTICS : queries.GET_FULL_PROJECT_STATISTICS;
    const query = this.apollo
      .watchQuery({
        query: graphql_query,
        variables: {
          projectId: id
        },
        fetchPolicy: 'cache-and-network',
      });
    return query.valueChanges.pipe(
      map((result) => {
        return result['data']['projectByProjectId']
      })
    );
  }

  getProjectUploadedRecords(id: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_PROJECT_UPLOADED_RECORDS,
        variables: {
          projectId: id
        },
        fetchPolicy: 'no-cache',
      });
    return query.valueChanges.pipe(
      map((result) => {
        return result['data']['projectByProjectId']
      })
    );
  }

  getConfusionMatrixByAttributeId(projectId: string, labelingTaskId: string, sliceId: string = null) {
    return this.apollo
      .query({
        query: queries.GET_CONFUSION_MATRIX,
        variables: {
          projectId: projectId,
          labelingTaskId: labelingTaskId,
          sliceId: sliceId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return JSON.parse(result['data']['confusionMatrix']);
        })
      );
  }

  getInterAnnotatorAgreement(projectId: string, labelingTaskId: string, includeGoldStar: boolean = null, includeAllOrgUser: boolean = null, onlyOnStaticSlice: string = null) {
    return this.apollo
      .query({
        query: queries.GET_INTER_ANNOTATOR_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
          labelingTaskId: labelingTaskId,
          includeGoldStar: includeGoldStar,
          includeAllOrgUser: includeAllOrgUser,
          onlyOnStaticSlice: onlyOnStaticSlice,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return result['data']['interAnnotatorMatrix'];
        })
      );
  }

  getProjectById(
    projectId: string
  ): Observable<Project> {
    return this.apollo
      .watchQuery({
        query: queries.GET_PROJECT_BY_ID,
        variables: {
          projectId: projectId,
        },
      })
      .valueChanges.pipe(
        map((result) => {
          return result['data']['projectByProjectId'];
        })
      );
  }
  getGeneralProjectStats(projectId: string, labelingTaskId: string = null, sliceId: string = null) {
    return this.apollo
      .query({
        query: queries.GET_GENERAL_PROJECT_STATS,
        variables: {
          projectId: projectId,
          labelingTaskId: labelingTaskId,
          sliceId: sliceId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return JSON.parse(result['data']['generalProjectStats']);
        })
      );
  }
  getLabelDistributions(projectId: string, labelingTaskId: string = null, sliceId: string = null) {
    return this.apollo
      .query({
        query: queries.GET_LABEL_DISTRIBUTION,
        variables: {
          projectId: projectId,
          labelingTaskId: labelingTaskId,
          sliceId: sliceId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return JSON.parse(result['data']['labelDistribution']);
        })
      );
  }

  getProjectByIdQuery(
    projectId: string
  ) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_PROJECT_BY_ID,
        variables: {
          projectId: projectId,
        },
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['projectByProjectId']; // FIXME: Create Proper mutation!
      })
    );
    return [query, vc];
  }

  getAttributesByProjectId(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_ATTRIBUTES_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['attributesByProjectId'].map((data) => {
          return {
            id: data.id,
            name: data.name,
            dataType: data.dataType,
            isPrimaryKey: data.isPrimaryKey,
            relativePosition: data.relativePosition,
            isCreated: data.isCreated,
            codeColumn: data.codeColumn,
            state: data.state
          };
        });
      })
    );
    return [query, vc];
  }

  getProjectTokenization(projectId: string) {
    return this.apollo
      .query({
        query: queries.GET_PROJECT_TOKENIZATION,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return result['data']['projectTokenization'];
        })
      );
  }

  getProjectSize(projectId: string) {
    return this.apollo
      .query({
        query: queries.GET_PROJECT_SIZE,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          return result['data']['projectSize'];
        })
      );
  }
  getCompositeKeyIsValid(projectId: string) {
    return this.apollo
      .query({
        query: queries.CHECK_COMPOSITE_KEY,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return result['data']['checkCompositeKey'];
        })
      );
  }

  isRatsTokenizationStillRunning(projectId: string) {
    return this.apollo
      .query({
        query: queries.IS_RATS_TOKENIZAION_STILL_RUNNING,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map((result) => {
          return result['data']['isRatsTokenizationStillRunning'];
        })
      );
  }

  getLabelingTasksByProjectId(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        let rPos = { pos: 9990 }; //as object to increase in private funciton
        return result['data']['projectByProjectId']['labelingTasks'][
          'edges'
        ].map((edge) => {
          const data = edge.node;
          return {
            id: data.id,
            name: data.name,
            taskTarget: data.taskTarget,
            attribute: data.attribute,
            taskType: data.taskType,
            relativePosition: this.labelingTaskRelativePosition(
              data.attribute?.relativePosition,
              rPos
            ), //target record has no attribute --> endpos
            labels: !data.labels.edges
              ? []
              : data.labels.edges.map((edge) => {
                return edge.node;
              }),
            informationSources: !data.informationSources.edges
              ? []
              : data.informationSources.edges.map((edge) => {
                return edge.node;
              }),
          };
        });
      })
    );
    return [query, vc];
  }


  private labelingTaskRelativePosition(
    relativePosition,
    rPos: { pos: number }
  ): number {
    if (relativePosition) return relativePosition;
    rPos.pos += 1;
    return rPos.pos;
  }

  addLabelingTask(
    projectId: string,
    labelingTaskName: string,
    labelingTaskType: string,
    labelingTaskTargetId: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_LABELING_TASK,
      variables: {
        projectId: projectId,
        labelingTaskName: labelingTaskName,
        labelingTaskType: labelingTaskType,
        labelingTaskTargetId: labelingTaskTargetId,
      },
      refetchQueries: [
        {
          query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  updateLabelingTask(
    projectId: string,
    labelingTaskId: string,
    labelingTaskName: string,
    labelingTaskType: string,
    labelingTaskTargetId: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_LABELING_TASK,
      variables: {
        projectId: projectId,
        labelingTaskId: labelingTaskId,
        labelingTaskName: labelingTaskName,
        labelingTaskType: labelingTaskType,
        labelingTaskTargetId: labelingTaskTargetId,
      },
      refetchQueries: [
        {
          query: queries.GET_ATTRIBUTES_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  deleteLabelingTask(projectId: string, labelingTaskId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_LABELING_TASK,
      variables: {
        projectId: projectId,
        labelingTaskId: labelingTaskId,
      },
      refetchQueries: [
        {
          query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  updateAttribute(
    projectId: string,
    attributeId: string,
    dataType: string,
    isPrimaryKey: boolean,
    name: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_ATTRIBUTE,
      variables: {
        projectId: projectId,
        attributeId: attributeId,
        dataType: dataType,
        isPrimaryKey: isPrimaryKey,
        name: name
      },
      refetchQueries: [
        {
          query: queries.GET_ATTRIBUTES_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  createAttributeTokenStatistics(
    projectId: string,
    attributeId: string
  ) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_ATTRIBUTE_TOKEN_STATISTICS,
      variables: {
        projectId: projectId,
        attributeId: attributeId,
      }
    });
  }

  createLabel(projectId: string, labelingTaskId: string, labelName: string, labelColor: string) {
    return this.apollo.mutate({
      mutation: mutations.CREATE_LABEL,
      variables: {
        projectId: projectId,
        labelName: labelName,
        labelingTaskId: labelingTaskId,
        labelColor: labelColor
      },
      refetchQueries: [
        {
          query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  updateLabelColor(projectId: string, labelingTaskLabelId: string, labelColor: string) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_LABEL_COLOR,
      variables: {
        projectId: projectId,
        labelColor: labelColor,
        labelingTaskLabelId: labelingTaskLabelId,
      },
      refetchQueries: [
        {
          query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  updateLabelHotkey(projectId: string, labelingTaskLabelId: string, labelHotkey: string) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_LABEL_HOTKEY,
      variables: {
        projectId: projectId,
        labelHotkey: labelHotkey,
        labelingTaskLabelId: labelingTaskLabelId,
      },
      refetchQueries: [
        {
          query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  deleteLabel(projectId: string, labelId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_LABEL,
      variables: {
        projectId: projectId,
        labelId: labelId,
      },
      refetchQueries: [
        {
          query: queries.GET_LABELING_TASKS_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  updateProjectStatus(projectId: string, newStatus: string) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_PROJECT_STATUS,
      variables: {
        projectId: projectId,
        newStatus: newStatus,
      },
      refetchQueries: [
        {
          query: queries.GET_PROJECT_LIST,
        },
      ],
    });
  }

  updateProjectNameAndDescription(projectId: string, name: string, description: string) {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_PROJECT_NAME_AND_DESCRIPTION,
      variables: {
        projectId: projectId,
        name: name,
        description: description,
      },
      refetchQueries: [
        {
          query: queries.GET_PROJECT_LIST,
        },
      ],
    });
  }

  getQueryStrategies(projectId: string) {
    return this.apollo
      .watchQuery({
        query: queries.GET_QUERY_STRATEGIES_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
        },
      })
      .valueChanges.pipe(map((result) => result['data']['allQueryStrategies']));
  }

  getEmbeddingSchema(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_EMBEDDING_SCHEMA_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['projectByProjectId']['embeddings'][
          'edges'
        ].map((wrapper) => wrapper['node']);
      })
    );
    return [query, vc]
  }

  getRecomendedEncodersForEmbeddings(projectId: string) {
    return this.apollo
      .watchQuery({
        query: queries.GET_RECOMMENDED_ENCODERS_FOR_EMBEDDINGS,
        variables: {
          projectId: projectId,
        },
      })
      .valueChanges.pipe(
        map((result) => {
          return result['data']['recommendedEncoders'];
        })
      );
  }

  createEmbedding(projectId: string, attributeId: string, embeddingHandle: string, granularity: string) {
    return this.apollo.mutate({
      mutation: granularity == "TOKEN" ? mutations.CREATE_TOKEN_LEVEL_EMBEDDING : mutations.CREATE_ATTRIBUTE_LEVEL_EMBEDDING,
      variables: {
        projectId: projectId,
        attributeId: attributeId,
        embeddingHandle: embeddingHandle,
      },
      refetchQueries: [
        {
          query: queries.GET_EMBEDDING_SCHEMA_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  deleteEmbedding(projectId: string, embeddingId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_EMBEDDING,
      variables: {
        projectId: projectId,
        embeddingId: embeddingId,
      },
      refetchQueries: [
        {
          query: queries.GET_EMBEDDING_SCHEMA_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }
  exportRecords(projectId: string, sessionId: string = null) {
    return this.apollo
      .query({
        query: queries.EXPORT_RECORDS_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
          sessionId: sessionId,
        },
        fetchPolicy: 'no-cache'
      })
      .pipe(map((result) => result['data']['export']));
  }

  exportProject(projectId: string, exportOptions: string = null) {
    return this.apollo
      .query({
        query: queries.EXPORT_PROJECT_BY_PROJECT_ID,
        variables: {
          projectId: projectId,
          exportOptions: exportOptions
        },
        fetchPolicy: 'no-cache'
      })
      .pipe(map((result) => result['data']['exportProject']));
  }

  prepareProjectExport(projectId: string, exportOptions: string) {
    return this.apollo
      .query({
        query: queries.PREPARE_PROJECT_EXPORT,
        fetchPolicy: 'network-only',
        variables: {
          projectId: projectId,
          exportOptions: exportOptions
        },
      })
      .pipe(map((result) => result['data']['prepareProjectExport']));
  }

  getLastProjectExportCredentials(projectId: string) {
    return this.apollo
      .query({
        query: queries.LAST_PROJECT_EXPORT_CREDENTIALS,
        fetchPolicy: 'network-only',
        variables: {
          projectId: projectId
        },
      })
      .pipe(map((result) => result['data']['lastProjectExportCredentials']));
  }

  getUploadLink(
    projectId: string,
    fileType: string,
    recordType: string
  ): Observable<string> {
    return this.apollo
      .query({
        query: queries.GET_UPLOAD_LINK,
        fetchPolicy: 'network-only',
        variables: {
          projectId: projectId,
          fileType: fileType,
          recordType: recordType,
        },
      })
      .pipe(map((result) => result['data']['uploadLink']));
  }

  getUploadCredentialsAndId(
    projectId: string,
    fileName: string,
    fileType: string,
    fileImportOptions: string

  ): Observable<string> {
    return this.apollo
      .query({
        query: queries.GET_UPLOAD_CREDENTIALS_AND_ID,
        fetchPolicy: 'network-only',
        variables: {
          projectId: projectId,
          fileName: fileName,
          fileType: fileType,
          fileImportOptions: fileImportOptions
        },
      })
      .pipe(map((result) => result['data']['uploadCredentialsAndId']));
  }

  getUploadTasksByProjectId(projectId: string) {
    return this.apollo
      .query({
        query: queries.GET_UPLOAD_TASKS_BY_PROJECT_ID,
        fetchPolicy: 'network-only',
        variables: {
          projectId: projectId,
        },
      })
      .pipe(
        map((result) => {
          return result.data['projectByProjectId'].uploadTasks.edges.map((data) => data['node']
          );
        })
      );
  }

  getUploadTaskByTaskId(projectId: string, uploadTaskId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_UPLOAD_TASK_BY_TASK_ID,
        fetchPolicy: 'network-only',
        variables: {
          projectId: projectId,
          uploadTaskId: uploadTaskId,
        },
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['uploadTaskById'];
      })
    );
    return [query, vc]
  }



  getAllTokenizerOptions() {
    return this.apollo
      .query({
        query: queries.GET_ALL_TOKENIZER_OPTIONS,
        fetchPolicy: 'cache-first', //this shouldnt change often (also default value)
      })
      .pipe(map((result) => result['data']['languageModels']));
  }

  changeProjectTokenizer(projectId: string, tokenizer: string) {
    //maybe check if project initProgress == INIT_COMPLETE? backend
    return this.apollo.mutate({
      mutation: mutations.UPDATE_PROJECT_TOKENIZER,
      variables: {
        projectId: projectId,
        tokenizer: tokenizer,
      },
    });
  }

  createDataSlice(
    projectId: string,
    name: string,
    is_static: boolean,
    filterRaw,
    filterData,
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.CREATE_DATA_SLICE,
      variables: {
        projectId: projectId,
        name: name,
        static: is_static,
        filterRaw: filterRaw,
        filterData: filterData
      },
      refetchQueries: [
        {
          query: queries.DATA_SLICES,
          variables: {
            projectId: projectId,
          },
        },
      ],
    })
  }

  updateDataSlice(
    projectId: string,
    id: string,
    is_static: Boolean,
    filterRaw,
    filterData
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.UPDATE_DATA_SLICE,
      variables: {
        projectId: projectId,
        dataSliceId: id,
        static: is_static,
        filterRaw: filterRaw,
        filterData: filterData
      },
      refetchQueries: [
        {
          query: queries.DATA_SLICES,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }


  deleteDataSlice(
    projectId: string,
    dataSliceId: string,
  ): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.DELETE_DATA_SLICE,
      variables: {
        projectId: projectId,
        dataSliceId: dataSliceId
      }, refetchQueries: [
        {
          query: queries.DATA_SLICES,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  getDataSlices(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.DATA_SLICES,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['dataSlices'];
      })
    );
    return [query, vc];
  }

  getCurrentWeakSupervisionRun(projectId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_CURRENT_WEAK_SUPERVISION_RUN,
        variables: {
          projectId: projectId,
        },
        fetchPolicy: 'no-cache',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['currentWeakSupervisionRun'];
      })
    );
    return [query, vc];
  }

  createOutlierSlice(
    projectId: string,
    embeddingId: string,): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.CREATE_OUTLIER_SLICE,
      variables: {
        projectId: projectId,
        embeddingId: embeddingId,
      },
      refetchQueries: [
        {
          query: queries.DATA_SLICES,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }

  addNewAttribute(projectId: string): Observable<any> {
    return this.apollo.mutate({
      mutation: mutations.ADD_NEW_ATTRIBUTE,
      variables: {
        projectId: projectId
      },
    });
  }

  getAttributeByAttributeId(projectId: string, attributeId: string) {
    const query = this.apollo
      .watchQuery({
        query: queries.GET_ATTRIBUTE_BY_ATTRIBUTE_ID,
        variables: {
          projectId: projectId,
          attributeId: attributeId,
        },
        fetchPolicy: 'network-only',
      });
    const vc = query.valueChanges.pipe(
      map((result) => {
        return result['data']['attributeByAttributeId'];
      })
    );
    return [query, vc];
  }

  deleteAttribute(projectId: string, attributeId: string) {
    return this.apollo.mutate({
      mutation: mutations.DELETE_ATTRIBUTE,
      variables: {
        projectId: projectId,
        attributeId: attributeId
      }, refetchQueries: [
        {
          query: queries.GET_ATTRIBUTES_BY_PROJECT_ID,
          variables: {
            projectId: projectId,
          },
        },
      ],
    });
  }
}
