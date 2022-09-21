import { gql } from 'apollo-angular';

export const mutations = {
  // TODO: consider renaming
  CREATE_INFORMATION_SOURCE_PAYLOAD: gql`
    mutation ($projectId: ID!, $informationSourceId: ID!) {
      createPayload(projectId: $projectId, informationSourceId: $informationSourceId) {
        payload {
          id
        }
      }
    }
  `,

  TOGGLE_INFORMATION_SOURCE_SELECTED: gql`
    mutation ($projectId: ID!, $informationSourceId: ID!) {
      toggleInformationSource(projectId: $projectId, informationSourceId: $informationSourceId) {
        ok
      }
    }
  `,

  CREATE_INFORMATION_SOURCE: gql`
  mutation ($projectId: ID!, $labelingTaskId: ID!, $description: String!, $sourceCode: String!, $name: String!, $type: String!) {
    createInformationSource(projectId: $projectId, labelingTaskId: $labelingTaskId, type: $type, description: $description, sourceCode: $sourceCode, name: $name) {
      informationSource {
        id
        name
        createdAt
        sourceCode
        description
        isSelected
        projectId
      }
    }
  }
  
  `,
  CREATE_ZERO_SHOT_INFORMATION_SOURCE: gql`
  mutation ($projectId: ID!, $targetConfig: String!, $labelingTaskId: ID!, $attributeId: ID) {
    createZeroShotInformationSource(projectId: $projectId, targetConfig: $targetConfig, labelingTaskId: $labelingTaskId, attributeId: $attributeId) {
      id
    }
  }  
  `,

  DELETE_INFORMATION_SOURCE: gql`
    mutation ($projectId: ID!, $informationSourceId: ID!) {
      deleteInformationSource(
        projectId: $projectId
        informationSourceId: $informationSourceId
      ) {
        ok
      }
    }
  `,

  UPDATE_INFORMATION_SOURCE: gql`
  mutation ($projectId: ID!, $informationSourceId: ID!, $labelingTaskId: ID!, $code: String, $description: String, $name: String) {
    updateInformationSource(projectId: $projectId, informationSourceId: $informationSourceId, labelingTaskId: $labelingTaskId, code: $code, description: $description, name: $name) {
      ok
    }
  }
  
`,

  INITIATE_WEAK_SUPERVISIONS: gql`
    mutation ($projectId: ID!) {
      initiateWeakSupervisionByProjectId(projectId: $projectId) {
        ok
      }
    }
  `,

  RUN_HEURISTIC_THEN_TRIGGER_WEAK_SUPERVISION: gql`
    mutation ($projectId: ID!, $informationSourceId: ID!, $labelingTaskId: ID!) {
      runHeuristicThenTriggerWeakSupervision(
        projectId: $projectId, informationSourceId: $informationSourceId, labelingTaskId: $labelingTaskId
      ) {
        ok
      }
    }
  `,

  RUN_ZERO_SHOT_PROJECT: gql`
  mutation ($projectId: ID!, $informationSourceId: ID!) {
    zeroShotProject(projectId: $projectId, informationSourceId: $informationSourceId) {
      ok
    }
  }
  
  `,

  SET_ALL_INFORMATION_SOURCES: gql`
  mutation ($projectId: ID!, $value: Boolean!) {
    setAllInformationSourceSelected(projectId: $projectId, value: $value) {
      ok
    }
  }
  
  `,

  SET_ALL_MODEL_CALLBACKS: gql`
  mutation ($projectId: ID!, $value: Boolean!) {
    setAllModelCallbacksSelected(projectId: $projectId, value: $value) {
      ok
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
};
