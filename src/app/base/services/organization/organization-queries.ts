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
        role
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
  GET_OVERVIEW_STATS: gql`
  {
    overviewStats
  }  
  `,

  GET_CAN_CREATE_LOCAL_ORG: gql`
  query{
    canCreateLocalOrg
  } 
  `
};
