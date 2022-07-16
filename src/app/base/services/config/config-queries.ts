import { gql } from 'apollo-angular';

export const queries = {
  GET_ORGANIZATION: gql`
    query {
      userOrganization {
        id
        name
      }
    }
  `,

  GET_USER_INFO: gql`
    query {
      userInfo {
        id
        firstName
        lastName
        mail
      }
    }
  `,
  GET_ORGANIZATION_USERS: gql`
    query{
      allUsers{
        id
        mail
        firstName
        lastName
      }
    }
  `,
  GET_ORGANIZATION_USERS_WITH_COUNT: gql`
  query($projectId:ID!){
    allUsersWithRecordCount(projectId:$projectId) {
      user {
        id
        mail
        firstName
        lastName
      }
      counts
    }
  }  
  `,
  IS_MANAGED: gql`
  query{
    isManaged
  }  
  `
};
