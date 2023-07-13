import { gql } from 'apollo-angular';

export const mutations = {
  CREATE_PROJECT: gql`
    mutation ($name: String, $description: String!) {
      createProject(name: $name, description: $description) {
        project {
          id
        }
      }
    }
  `,
  CREATE_SAMPLE_PROJECT: gql`
  mutation($name:String, $projectType: String){
    createSampleProject(name:$name, projectType:$projectType){
      ok
      project{
        id
        name
        description
      }
    }
  }  
  `,


  DELETE_PROJECT: gql`
    mutation ($projectId: ID!) {
      deleteProject(projectId: $projectId) {
        ok
      }
    }
  `,

  UPDATE_ATTRIBUTE: gql`
  mutation($projectId: ID!, $attributeId: ID!, $dataType: String, $isPrimaryKey: Boolean, $name: String, $sourceCode: String, $visibility: String) {
    updateAttribute(
      projectId: $projectId, 
      attributeId: $attributeId, 
      dataType: $dataType,
      isPrimaryKey:$isPrimaryKey,
      name: $name,
      sourceCode: $sourceCode,
      visibility: $visibility
    ) {
      ok
    }
  }
  `,
  CREATE_ATTRIBUTE_TOKEN_STATISTICS: gql`
  mutation($projectId:ID!,$attributeId:ID!){
    createAttributeTokenStatistics(projectId:$projectId, attributeId:$attributeId){
      ok
    }
  }
  `,

  UPDATE_LABELING_TASK: gql`
  mutation ($projectId: ID!, $labelingTaskId: ID!, $labelingTaskName: String!, $labelingTaskType: String!, $labelingTaskTargetId: ID) {
    updateLabelingTask(projectId: $projectId, labelingTaskId: $labelingTaskId, labelingTaskName: $labelingTaskName, labelingTaskType: $labelingTaskType, labelingTaskTargetId: $labelingTaskTargetId) {
      ok
    }
  }
  `,

  DELETE_LABELING_TASK: gql`mutation ($projectId: ID!, $labelingTaskId: ID!) {
    deleteLabelingTask(projectId: $projectId, labelingTaskId: $labelingTaskId) {
      ok
    }
  }
  `,

  CREATE_LABELING_TASK: gql`
  mutation ($projectId: ID!, $labelingTaskName: String!,$labelingTaskType:String!, $labelingTaskTargetId: ID) {
    createLabelingTask(projectId: $projectId, labelingTaskName: $labelingTaskName,labelingTaskType:$labelingTaskType, labelingTaskTargetId: $labelingTaskTargetId) {
      ok
    }
  }
  `,
  CREATE_TASK_AND_LABELS: gql`
  mutation ($projectId: ID!, $labelingTaskName: String!,$labelingTaskType:String!, $labelingTaskTargetId: ID,$labels:[String]) {
    createTaskAndLabels(projectId: $projectId, labelingTaskName: $labelingTaskName,labelingTaskType:$labelingTaskType, labelingTaskTargetId: $labelingTaskTargetId,labels:$labels) {
      ok
      taskId
    }
  }
  `,

  CREATE_LABEL: gql`
  mutation ($projectId: ID!, $labelingTaskId: ID!, $labelName: String!, $labelColor: String!) {
    createLabel(projectId: $projectId, labelingTaskId: $labelingTaskId, labelName: $labelName, labelColor: $labelColor) {
      label {
        id
        name
      }
    }
  }
  `,
  CREATE_LABELS: gql`
  mutation ($projectId: ID!, $labelingTaskId: ID!, $labels: [String]!) {
    createLabels(projectId: $projectId, labelingTaskId: $labelingTaskId, labels: $labels) {
      ok
    }
  }
  `,

  UPDATE_LABEL_COLOR: gql`
  mutation ($projectId: ID!, $labelingTaskLabelId: ID!, $labelColor: String!) {
    updateLabelColor(projectId: $projectId, labelingTaskLabelId: $labelingTaskLabelId, labelColor: $labelColor) {
      ok
    }
  }
  `,
  UPDATE_LABEL_NAME: gql`
  mutation ($projectId: ID!, $labelId: ID!, $newName: String!) {
    updateLabelName(projectId: $projectId, labelingTaskLabelId: $labelId, newName: $newName) {
      ok
    }
  }  `,
  HANDLE_LABEL_RENAME_WARNING: gql`
  mutation ($projectId: ID!, $warningData: JSONString!) {
    handleLabelRenameWarnings(projectId: $projectId, warningData: $warningData) {
      ok
    }
  } `,
  UPDATE_LABEL_HOTKEY: gql`
  mutation ($projectId: ID!, $labelingTaskLabelId: ID!, $labelHotkey: String!) {
    updateLabelHotkey(projectId: $projectId, labelingTaskLabelId: $labelingTaskLabelId, labelHotkey: $labelHotkey) {
      ok
    }
  }
  `,

  DELETE_LABEL: gql`
    mutation ($projectId: ID!, $labelId: ID!) {
      deleteLabel(projectId: $projectId, labelId: $labelId) {
        ok
      }
    }
  `,

  DELETE_USER_ATTRIBUTE: gql`
    mutation($projectId:ID!,$attributeId:ID!){
      deleteUserAttribute(projectId:$projectId,attributeId:$attributeId){
        ok
      }
    }
  `,

  UPDATE_PROJECT_STATUS: gql`
    mutation ($projectId: ID!, $newStatus: String) {
      updateProjectStatus(projectId: $projectId, newStatus: $newStatus) {
        ok
      }
    }
  `,
  UPDATE_PROJECT_NAME_AND_DESCRIPTION: gql`
  mutation ($projectId: ID!, $name: String, $description: String) {
    updateProjectNameAndDescription(projectId: $projectId, name: $name, description: $description) {
      ok
    }
  }  
`,
  UPDATE_PROJECT_TOKENIZER: gql`
  mutation($projectId:ID!,$tokenizer:String){
    updateProjectTokenizer(projectId:$projectId,tokenizer:$tokenizer){
      ok
    }
  }`,

  CREATE_EMBEDDING: gql`
  mutation($projectId: ID!, $attributeId: ID!, $config: JSONString!) {
    createEmbedding(projectId: $projectId, attributeId: $attributeId, config: $config) {
      ok
    }
  }  
  `,

  DELETE_EMBEDDING: gql`
  mutation ($projectId: ID!, $embeddingId: ID!) {
    deleteEmbedding(projectId: $projectId, embeddingId: $embeddingId) {
      ok
    }
  }
  
  `,
  DELETE_FROM_TASK_QUEUE: gql`
  mutation ($projectId: ID!, $taskId: ID!) {
    deleteFromTaskQueue(projectId: $projectId, taskId: $taskId) {
      ok
    }
  }
  
  `,
  CREATE_DATA_SLICE: gql`
  mutation($projectId: ID!, $name: String!, $static: Boolean!, $filterRaw: JSONString!, $filterData: [JSONString]!){
    createDataSlice(projectId: $projectId, name: $name, static: $static, filterRaw: $filterRaw, filterData: $filterData){
      id
    }
  }
  `,
  UPDATE_DATA_SLICE: gql`
  mutation($projectId: ID!, $dataSliceId: ID!, $static: Boolean!, $filterRaw: JSONString!, $filterData: [JSONString]){
    updateDataSlice(projectId: $projectId, dataSliceId: $dataSliceId, static: $static, filterRaw: $filterRaw, filterData: $filterData){
      ok
    }
  }
  `,
  DELETE_DATA_SLICE: gql`
  mutation($projectId: ID!, $dataSliceId: ID!){
    deleteDataSlice(projectId: $projectId, dataSliceId: $dataSliceId){
      ok
    }
  }
  `,
  CREATE_OUTLIER_SLICE: gql`
  mutation($projectId: ID!, $embeddingId: ID!){
    createOutlierSlice(projectId: $projectId, embeddingId: $embeddingId) {
      ok
    } 
  }
  `,
  CREATE_USER_ATTRIBUTE: gql`
  mutation($projectId: ID!, $name: String!, $dataType: String!){
    createUserAttribute(projectId: $projectId, name: $name, dataType: $dataType) {
      ok
      attributeId
    } 
  }
  `,
  CALCULATE_USER_ATTRIBUTE_ALL_RECORDS: gql`
  mutation($projectId: ID!, $attributeId: ID!){
    calculateUserAttributeAllRecords(projectId: $projectId, attributeId: $attributeId) {
      ok
    } 
  }
  `,

  CREATE_ACCESS_LINK: gql`
  mutation ($projectId: ID!, $id: ID!, $type: String!) {
    generateAccessLink(projectId: $projectId, id: $id, type: $type) {
      link {
        id
        link
        isLocked
      }
    }
  }
`,

  REMOVE_ACCESS_LINK: gql`
mutation ($projectId: ID!, $linkId: ID!) {
  removeAccessLink(projectId: $projectId, linkId: $linkId) {
    ok
  }
}
`,
  LOCK_ACCESS_LINK: gql`
mutation ($projectId: ID!, $linkId: ID!, $lockState: Boolean) {
  lockAccessLink(projectId: $projectId, linkId: $linkId, lockState: $lockState) {
    ok
  }
}
`,
  SET_UPLOAD_MAPPINGS: gql`
mutation ($projectId: ID!, $uploadTaskId: ID!, $mappings: String!) {
  setUploadMappings(projectId: $projectId, uploadTaskId: $uploadTaskId, mappings: $mappings) {
    ok
  }
}

`,
  DELETE_PERSONAL_ACCESS_TOKEN: gql`
mutation ($projectId: ID!, $tokenId: ID!) {
  deletePersonalAccessToken(projectId: $projectId, tokenId: $tokenId) {
    ok
  }
}

`,
  CREATE_PERSONAL_ACCESS_TOKEN: gql`
mutation ($projectId: ID!, $name: String!, $expiresAt: String!, $scope: String!) {
  createPersonalAccessToken(projectId: $projectId, name: $name, expiresAt: $expiresAt, scope: $scope) {
    token
  }
}

`,
  MODEL_PROVIDER_DELETE_MODEL: gql`
mutation($modelName: String!) {
  modelProviderDeleteModel(modelName: $modelName) {
    ok
  }
}
`,

  MODEL_PROVIDER_DOWNLOAD_MODEL: gql`
mutation($modelName: String!) {
modelProviderDownloadModel(modelName: $modelName) {
  ok
}
}
`,

  UPDATE_PROJECT_FOR_GATES: gql`
mutation($projectId: ID!) {
  updateProjectForGates(projectId: $projectId){
    ok
  } 
}
`,

};
