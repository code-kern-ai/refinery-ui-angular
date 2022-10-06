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
        role
      }
    }
  `,
  GET_ORGANIZATION_USERS: gql`
  query($userRole:String){
    allUsers(userRole:$userRole) {
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
  `,

  REQUEST_COMMENTS: gql`
  query ($requested: JSONString!) {
    getAllComments(requested: $requested)
  }
  `,
  PROJECT_IDS: gql`
  query {
      allProjects {
        edges {
          node {
            id
          }
        }
      }
    }      
`,



};
