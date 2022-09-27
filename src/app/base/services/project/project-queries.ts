import { gql } from 'apollo-angular';

export const queries = {
  GET_PROJECT_LIST: gql`
    query {
        allProjects {
          edges {
            node {
              id
              name
              description
              status
              projectType
              numDataScaleUploaded
              createdAt
              user{
                firstName
                lastName
                mail
              }
            }
          }
        }
      }      
  `,
  GET_PROJECT_NAMES: gql`
  query {
      allProjects {
        edges {
          node {
            name
          }
        }
      }
    }      
`,
  GET_PROJECT_UPLOADED_RECORDS: gql`
  query ($projectId: ID!) {
    projectByProjectId(projectId: $projectId) {
      id
      name
      numDataScaleUploaded
    }
  }  
  `,

  GET_SCALE_PROJECT_STATISTICS: gql`
  query ($projectId: ID!){
    projectByProjectId(projectId: $projectId) {
      id
      numDataScaleUploaded
      numDataScaleManual
      numDataScaleProgrammatical
    }
  }
  `,

  GET_FULL_PROJECT_STATISTICS: gql`
  query ($projectId: ID!){
    projectByProjectId(projectId: $projectId) {
      id
      numDataScaleUploaded
      numDataScaleManual
      numDataScaleProgrammatical
      numDataTestManual
      numDataTestUploaded
    }
  }
  `,

  GET_UPLOAD_TASK_BY_TASK_ID: gql`
  query ($projectId: ID!, $uploadTaskId: ID!) {
    uploadTaskById(projectId: $projectId, uploadTaskId: $uploadTaskId) {
      id
      userId
      state
      progress
    }
  }
  `,
  GET_UPLOAD_TASKS_BY_PROJECT_ID: gql`
  query ($projectId: ID!) {
    projectByProjectId(projectId: $projectId) {
      uploadTasks {
        edges {
          node {
            id
            projectId
            state
            progress
          }
        }
      }
    }
  }  
  `,

  GET_PROJECT_BY_ID: gql`
    query ($projectId: ID!) {
      projectByProjectId(projectId: $projectId) {
        id
        name
        description
        projectType
        tokenizer
        numDataScaleUploaded
        containsUniqueAttribute
      }
    }
  `,
  GET_GENERAL_PROJECT_STATS: gql`
    query($projectId:ID!,$labelingTaskId:ID,$sliceId:ID){
      generalProjectStats(projectId:$projectId,labelingTaskId:$labelingTaskId,sliceId:$sliceId)
    }
  `,
  GET_LABEL_DISTRIBUTION: gql`
  query($projectId:ID!,$labelingTaskId:ID,$sliceId:ID){
    labelDistribution(projectId:$projectId,labelingTaskId:$labelingTaskId,sliceId:$sliceId)
  }
`,

  GET_CONFIDENCE_DISTRIBUTION: gql`
  query ($projectId: ID!, $labelingTaskId: ID, $sliceId: ID) {
    confidenceDistribution(projectId: $projectId, labelingTaskId: $labelingTaskId, sliceId: $sliceId)
  }  
  `,

  GET_ATTRIBUTES_BY_PROJECT_ID: gql`
  query($projectId: ID!, $stateFilter: [String!]) {
    attributesByProjectId(projectId: $projectId, stateFilter: $stateFilter) {
      id
      name
      dataType
      isPrimaryKey
      relativePosition    
      userCreated
      sourceCode
      state
      logs
    }
  }  
  `,
  GET_LABELING_TASKS_BY_PROJECT_ID: gql`
  query ($projectId: ID!) {
    projectByProjectId(projectId: $projectId) {
      id
      labelingTasks {
        edges {
          node {
            id
            name
            taskTarget
            taskType
            attribute {
              id
              name
              relativePosition
              dataType
            }
            labels {
              edges {
                node {
                  id
                  name
                  color
                  hotkey
                }
              }
            }
            informationSources {
              edges {
                node {
                  id
                  type
                  returnType
                  name
                  description
                }
              }
            }
          }
        }
      }
    }
  }  
 
  `,

  GET_CONFUSION_MATRIX: gql`
  query($projectId:ID!,$labelingTaskId:ID!,$sliceId:ID){
    confusionMatrix(projectId:$projectId,labelingTaskId:$labelingTaskId,sliceId:$sliceId)
  }
  
  `,
  GET_INTER_ANNOTATOR_BY_PROJECT_ID: gql`
  query ($projectId: ID!, $labelingTaskId: ID!, $includeGoldStar: Boolean, $includeAllOrgUser: Boolean, $onlyOnStaticSlice: ID) {
    interAnnotatorMatrix(projectId: $projectId, labelingTaskId: $labelingTaskId, includeGoldStar: $includeGoldStar, includeAllOrgUser: $includeAllOrgUser, onlyOnStaticSlice: $onlyOnStaticSlice) {
      countNames
      allUsers {
        count
        user {
          id
          firstName
          lastName
          mail
        }
      }
      elements {
        userIdA
        userIdB
        percent
      }
    }
  }  
  
  `,


  GET_QUERY_STRATEGIES_BY_PROJECT_ID: gql`
    query ($projectId: ID!) {
      allQueryStrategies(projectId: $projectId)
    }
  `,

  GET_EMBEDDING_SCHEMA_BY_PROJECT_ID: gql`
  query ($projectId: ID!) {
    projectByProjectId(projectId: $projectId) {
      id
      embeddings {
        edges {
          node {
            id
            name
            custom
            type
            state
            progress
            dimension
            count
          }
        }
      }
    }
  }
  `,
  GET_RECOMMENDED_ENCODERS_FOR_EMBEDDINGS: gql`
  query ($projectId: ID!) {
    recommendedEncoders(projectId: $projectId) {
      configString
      description
      tokenizers
      applicability
    }
  } 
  `,

  EXPORT_RECORDS_BY_PROJECT_ID: gql`
    query ($projectId: ID!, $sessionId: ID) {
      export(projectId: $projectId, sessionId: $sessionId)
    }
  `,

  EXPORT_PROJECT_BY_PROJECT_ID: gql`
  query ($projectId: ID!, $exportOptions: JSONString) {
    exportProject(projectId: $projectId, exportOptions: $exportOptions)
  }  
`,
  PREPARE_PROJECT_EXPORT: gql`
  query ($projectId: ID!, $exportOptions: JSONString) {
    prepareProjectExport(projectId: $projectId, exportOptions: $exportOptions)
  }`,
  LAST_PROJECT_EXPORT_CREDENTIALS: gql`
  query ($projectId: ID!) {
    lastProjectExportCredentials(projectId:$projectId)
  }`,

  GET_UPLOAD_LINK: gql`
    query ($projectId: ID!, $fileType: String!, $recordType: String!) {
      uploadLink(projectId: $projectId, fileType: $fileType, recordType: $recordType)
    }
  `,
  GET_UPLOAD_CREDENTIALS_AND_ID: gql`
    query ($projectId: ID!, $fileName: String!, $fileType: String!,$fileImportOptions:String!) {
      uploadCredentialsAndId(projectId: $projectId, fileName: $fileName, fileType: $fileType,fileImportOptions:$fileImportOptions)
    }
  `,
  GET_ALL_TOKENIZER_OPTIONS: gql`
  query{
    languageModels{
      name,
      configString
    }
  }`,
  GET_TOOLTIP: gql`
  query($key:String!){
    tooltip(key:$key){
      key
      title
      text
      href
      hrefCaption
    }
  }
  `,
  CHECK_COMPOSITE_KEY: gql`
  query($projectId:ID!){
    checkCompositeKey(projectId:$projectId)
  }`,
  IS_RATS_TOKENIZAION_STILL_RUNNING: gql`
  query ($projectId: ID!) {
    isRatsTokenizationStillRunning(projectId: $projectId)
  }
  `,
  DATA_SLICES: gql`
  query($projectId:ID!,$sliceType:String){
    dataSlices(projectId:$projectId, sliceType:$sliceType){
      id
      name
      filterRaw
      filterData
      count
      static
      createdAt
      createdBy
      sliceType
      info
    }
  }
  `,
  GET_PROJECT_SIZE: gql`
  query ($projectId: ID!) {
    projectSize(projectId: $projectId) {
      table
      description
      default
      byteSize
      byteReadable
    }
  }  
  `,
  GET_CURRENT_WEAK_SUPERVISION_RUN: gql`
  query ($projectId: ID!) {
    currentWeakSupervisionRun(projectId: $projectId) {
      id
      state
      createdAt
      user {
        id
        firstName
        lastName
        mail
      }
      finishedAt
      selectedInformationSources
      selectedLabelingTasks
      distinctRecords
      resultCount
    }
  }
  
  `,
  GET_PROJECT_TOKENIZATION: gql`
  query ($projectId: ID!) {
    projectTokenization(projectId: $projectId) {
      id
      projectId
      userId
      type
      state
      progress
      workload
      startedAt
      finishedAt
    }
  }  
  `,
  GET_ATTRIBUTE_BY_ATTRIBUTE_ID: gql`
  query($projectId: ID!, $attributeId: ID!){
    attributeByAttributeId(projectId: $projectId, attributeId: $attributeId) {
      id
      name
      dataType
      isPrimaryKey
      relativePosition    
      userCreated
      sourceCode
      state
      logs
    }
  }
  `,
  CALCULATE_USER_ATTRIBUTE_SAMPLE_RECORDS: gql`
  query($projectId: ID!, $attributeId: ID!){
    calculateUserAttributeSampleRecords(projectId: $projectId, attributeId: $attributeId) {
      recordIds
      calculatedAttributes 
    }
  }
  `,
  GET_ACCESS_LINK: gql`
  query ($projectId: ID!, $linkId: ID!) {
    accessLink(projectId: $projectId, linkId: $linkId) {
      id
      link
      isLocked
    }
  }
`,
  REQUEST_HUDDLE_DATA: gql`
  query ($projectId: ID!, $huddleId: ID!, $huddleType: String!) {
    requestHuddleData(projectId: $projectId, huddleId: $huddleId, huddleType: $huddleType) {
      huddleId
      recordIds
      huddleType
      startPos
      allowedTask
      canEdit
      checkedAt
    }
  }
  
`,
  LINK_LOCKED: gql`
  query ($projectId: ID!, $linkRoute: String!) {
    linkLocked(projectId: $projectId, linkRoute: $linkRoute)
  }`
  ,
  LINK_DATA_OUTDATED: gql`
  query ($projectId: ID!, $linkRoute: String!, $lastRequestedAt: DateTime!) {
    linkDataOutdated(projectId: $projectId, linkRoute: $linkRoute, lastRequestedAt: $lastRequestedAt)
  }`
  ,
  AVAILABLE_LABELING_LINKS: gql`
  query ($projectId: ID!, $assumedRole: String, $assumedHeuristicId: ID) {
    availableLinks(projectId: $projectId, assumedRole: $assumedRole, assumedHeuristicId: $assumedHeuristicId) {
      id
      linkType
      link
      name
      isLocked
    }
  }`
  ,




};
