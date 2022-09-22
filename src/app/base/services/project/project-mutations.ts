import { gql } from 'apollo-angular';

export const mutations = {
  CREATE_PROJECT: gql`
    mutation ($name: String!, $description: String!) {
      createProject(name: $name, description: $description) {
        project {
          id
        }
      }
    }
  `,
  CREATE_SAMPLE_PROJECT: gql`
  mutation($name:String){
    createSampleProject(name:$name){
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
  mutation($projectId: ID!, $attributeId: ID!, $dataType: String, $isPrimaryKey: Boolean, $name: String, $sourceCode: String) {
    updateAttribute(
      projectId: $projectId, 
      attributeId: $attributeId, 
      dataType: $dataType,
      isPrimaryKey:$isPrimaryKey,
      name: $name,
      sourceCode: $sourceCode
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

  UPDATE_LABEL_COLOR: gql`
  mutation ($projectId: ID!, $labelingTaskLabelId: ID!, $labelColor: String!) {
    updateLabelColor(projectId: $projectId, labelingTaskLabelId: $labelingTaskLabelId, labelColor: $labelColor) {
      ok
    }
  }
  `,
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

  CREATE_TOKEN_LEVEL_EMBEDDING: gql`
  mutation ($projectId: ID!, $attributeId: ID!, $embeddingHandle: String!) {
    createTokenLevelEmbedding(projectId: $projectId, attributeId: $attributeId, embeddingHandle: $embeddingHandle) {
      ok
    }
  }  
  `,

  CREATE_ATTRIBUTE_LEVEL_EMBEDDING: gql`
  mutation ($projectId: ID!, $attributeId: ID!, $embeddingHandle: String!) {
    createAttributeLevelEmbedding(projectId: $projectId, attributeId: $attributeId, embeddingHandle: $embeddingHandle) {
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
  mutation($projectId: ID!){
    createUserAttribute(projectId: $projectId) {
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
`

};
