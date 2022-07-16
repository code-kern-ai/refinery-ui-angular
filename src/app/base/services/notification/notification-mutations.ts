import { gql } from 'apollo-angular';

export const mutations = {
  CREATE_NOTIFICATION: gql`
  mutation ($projectId: ID!, $message: String!) {
    createNotification(projectId: $projectId, message: $message) {
      ok
    }
  }

`,
};
