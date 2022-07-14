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
  `
};
