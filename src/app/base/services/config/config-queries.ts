import { gql } from 'apollo-angular';

export const queries = {

  IS_MANAGED: gql`
  query{
    isManaged
  }  
  `,
  IS_DEMO: gql`
  query{
    isDemo
  }  
  `,
  IS_AMDIN: gql`
  query{
    isAdmin
  }  
  `,
  GET_BLACK_WHITE_DEMO: gql`
  {
    getBlackWhiteDemo
  }  
  `,
  GET_VERSION_OVERVIEW: gql`
    query {
      versionOverview {
        service
        installedVersion
        remoteVersion
        lastChecked
        link
        remoteHasNewer
      }
    }
  `,

  GET_HAS_UPDATES: gql`
  {
    hasUpdates
  }`
};
