import { gql } from 'apollo-angular';

export const mutations = {
  UPDATE_CONFIG: gql`
    mutation ($dictStr: String!) {
        updateConfig(dictStr: $dictStr) {
          ok
        }
      }      
    `

};
