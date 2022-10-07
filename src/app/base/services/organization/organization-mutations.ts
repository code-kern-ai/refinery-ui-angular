import { gql } from 'apollo-angular';

export const mutations = {
  CREATE_ORGANIZATION: gql`
    mutation ($name: String!) {
      createOrganization(name: $name) {
        organization {
          id
        }
      }
    }
  `,

  ADD_USER_TO_ORGANIZATION: gql`
    mutation ($userMail: String!, $organizationName: String!) {
      addUserToOrganization(userMail: $userMail, organizationName: $organizationName) {
        ok
      }
    }
  `,
  POST_EVENT: gql`
  mutation ($eventName: String!, $eventData: JSONString!) {
    postEvent(eventName: $eventName, eventData: $eventData) {
      ok
    }
  }  
  `,
  CREATE_COMMENT: gql`
  mutation ($comment: String!, $xftype: String!, $xfkey: ID!, $projectId: ID, $isPrivate: Boolean) {
    createComment(comment: $comment, xftype: $xftype, xfkey: $xfkey, projectId: $projectId, isPrivate: $isPrivate) {
      ok
    }
  }
  
  `,
  DELETE_COMMENT: gql`
  mutation ($commentId: ID!, $projectId: ID) {
    deleteComment(commentId: $commentId, projectId: $projectId) {
      ok
    }
  }
  `,
  UPDATE_COMMENT: gql`
  mutation ($commentId: ID!, $changes: JSONString!, $projectId: ID) {
    updateComment(commentId: $commentId, changes: $changes, projectId: $projectId) {
      ok
    }
  }
  `
};
