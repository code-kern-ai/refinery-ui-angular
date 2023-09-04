import { gql } from 'apollo-angular';

export const mutations = {
  ADD_CLASSIFICATION_LABELS_TO_RECORD: gql`
  mutation ($projectId: ID!, $recordId: ID!, $labelingTaskId: ID, $labelId: ID, $asGoldStar:Boolean, $sourceId: ID) {
    addClassificationLabelsToRecord(projectId: $projectId, recordId: $recordId, labelingTaskId: $labelingTaskId, labelId: $labelId,asGoldStar:$asGoldStar, sourceId: $sourceId) {
      ok
    }
  }
  `,

  ADD_EXTRACTION_LABEL_TO_RECORD: gql`
  mutation ($projectId: ID!, $recordId: ID!, $labelingTaskId: ID!, $tokenStartIndex: Int!, $tokenEndIndex: Int!, $value: String!, $labelId: ID!, $asGoldStar:Boolean, $sourceId: ID) {
    addExtractionLabelToRecord(projectId: $projectId, recordId: $recordId, labelingTaskId: $labelingTaskId, tokenStartIndex: $tokenStartIndex, tokenEndIndex: $tokenEndIndex, value: $value, labelId: $labelId,asGoldStar:$asGoldStar, sourceId: $sourceId) {
      ok
    }
  }
  
`,

  DELETE_RECORD_BY_RECORD_ID: gql`  
  mutation($projectId: ID!, $recordId: ID!){
    deleteRecord(projectId:$projectId,recordId:$recordId){
      ok
    }
  }
`,
  EDIT_RECORDS: gql`
  mutation ($projectId: ID!, $changes: JSONString!) {
    editRecords(projectId: $projectId, changes: $changes) {
      ok
    }
  }
  `,
  DELETE_RECORD_LABEL_ASSOCIATION_BY_ID: gql`
  mutation($projectId: ID!, $recordId: ID!, $associationIds: [ID]){
    deleteRecordLabelAssociationByIds( 
      projectId:$projectId,
      recordId:$recordId,
      associationIds:$associationIds){
      ok
    }
  }
`,
  CHANGE_RECORD_LABEL_ASSOCIATION_COMMENT: gql`
  mutation ($projectId: ID!, $recordId: ID!, $nerId: ID!, $comment: String) {
    changeNerLabelComment(projectId: $projectId,recordId:$recordId, namedEntityId: $nerId, comment: $comment) {
      ok
    }
  }
  
`,
  SKIP_LABELING_RECORD: gql`
    mutation ($projectId: ID!, $recordId: ID!, $accessStrategy: String) {
      skipLabelingRecord(
        projectId: $projectId
        recordId: $recordId
        accessStrategy: $accessStrategy
      ) {
        ok
      }
    }
  `,
  UPLOAD_FILE: gql`
    mutation ($projectId: ID!, $data: [JSONString], $category: String) {
      uploadFile(projectId: $projectId, data: $data, category: $category) {
        ok
      }
    }
  `,

  UPLOAD_EMBEDDINGS: gql`
    mutation ($projectId: ID!, $data: [JSONString]!) {
      uploadEmbeddingsFile(projectId: $projectId, data: $data) {
        ok
      }
    }
  `,

  UPLOAD_LABELS: gql`
    mutation ($projectId: ID!, $data: [JSONString]!) {
      uploadLabelsFile(projectId: $projectId, data: $data) {
        ok
      }
    }
  `,
  SET_GOLD_STAR_ANNOTATION_FOR_TASK: gql`
  mutation ($projectId: ID!, $recordId: ID!, $labelingTaskId: ID!, $goldUserId: ID!) {
    setGoldStarAnnotationForTask(projectId: $projectId, recordId: $recordId, labelingTaskId: $labelingTaskId, goldUserId: $goldUserId) {
      ok
    }
  }  
  `,
  REMOVE_GOLD_STAR_ANNOTATION_FOR_TASK: gql`
  mutation ($projectId: ID!, $recordId: ID!, $labelingTaskId: ID!) {
    removeGoldStarAnnotationForTask(projectId: $projectId, recordId: $recordId, labelingTaskId: $labelingTaskId) {
      ok
    }
  }
  `
};
