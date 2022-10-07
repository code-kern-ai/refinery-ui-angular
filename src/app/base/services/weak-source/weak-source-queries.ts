import { gql } from 'apollo-angular';

export const queries = {
  GET_INFORMATION_SOURCE_OVERVIEW_DATA: gql`
  query($projectId:ID!){
    informationSourcesOverviewData(projectId:$projectId)
  }
  `,

  GET_MODEL_CALLBACKS_OVERVIEW_DATA: gql`
  query($projectId:ID!){
    modelCallbacksOverviewData(projectId:$projectId)
  }
  `,

  GET_INFORMATION_SOURCE_BY_SOURCE_ID: gql`
  query ($projectId: ID!, $informationSourceId: ID!) {
    informationSourceBySourceId(projectId: $projectId, informationSourceId: $informationSourceId) {
      id
      name
      type
      description
      sourceCode
      isSelected
      labelingTaskId
      returnType
      lastPayload {
        id
        createdAt
        finishedAt
        state
        iteration
        progress
        __typename
      }
      sourceStatistics {
        edges {
          node {
            labelingTaskLabel {
              name
              color
              __typename
            }
            truePositives
            falsePositives
            falseNegatives
            recordCoverage
            totalHits
            sourceConflicts
            sourceOverlaps
            active
          }
        }
      }
    }
  }

  `,
  GET_TASK_BY_TASK_ID: gql`
    query ($projectId: ID!, $payloadId: ID!) {
      payloadByPayloadId(projectId: $projectId, payloadId: $payloadId) {
        id
        createdAt
        state
        logs
        iteration
        informationSource {
          type
        }
      }
    }
`,
  GET_ZERO_SHOT_RECOMMENDATIONS: gql`
  query ($projectId: ID!) {
    zeroShotRecommendations(projectId: $projectId)
  }
`,
  GET_ZERO_SHOT_TEXT: gql`
  query ($projectId: ID!, $informationSourceId: ID!, $config: String!, $text: String!, $runIndividually:Boolean!, $labels: JSONString!) {
    zeroShotText(projectId: $projectId, informationSourceId: $informationSourceId, config: $config, text: $text, runIndividually: $runIndividually, labelNames: $labels) {
      config
      text
      labels {
        labelName
        confidence
      }
    }
  }  
  `,
  GET_ZERO_SHOT_10_RANDOM_RECORDS: gql`
  query ($projectId: ID!, $informationSourceId: ID!, $labels: JSONString) {
    zeroShot10Records(projectId: $projectId, informationSourceId: $informationSourceId, labelNames: $labels) {
      duration
      records {
        recordId
        checkedText
        fullRecordData
        labels {
          labelName
          confidence
        }
      }
    }
  }
  `,

  GET_MODEL_PROVIDER_INFO: gql`
  query{
    modelProviderInfo {
      name
      revision
      link
      date
      size
      status
      zeroShotPipeline
    }
  }
  `,
GET_LABELING_FUNCTION_ON_10_RECORDS: gql`
  query ($projectId: ID!, $informationSourceId: ID!) {
    getLabelingFunctionOn10Records(projectId: $projectId, informationSourceId: $informationSourceId) {
      records {	
        recordId
        calculatedLabels
        fullRecordData
      }
      containerLogs
    	codeHasErrors
    }
  }
`
};
