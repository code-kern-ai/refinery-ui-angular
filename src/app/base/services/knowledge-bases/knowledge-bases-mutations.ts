import { gql } from 'apollo-angular';

export const mutations = {
  CREATE_KNOWLEDGE_BASE: gql`
  mutation ($projectId: ID!) {
    createKnowledgeBase(projectId: $projectId) {
      knowledgeBase {
        id
        name
        description
      }
    }
  }
  
  `,
  ADD_TERM_TO_KNOWLEDGE_BASE: gql`
  mutation ($projectId: ID!, $value: String!, $comment: String, $knowledgeBaseId: ID!) {
    addTermToKnowledgeBase(projectId: $projectId, value: $value, comment: $comment, knowledgeBaseId: $knowledgeBaseId) {
      ok
    }
  }
`,
  DELETE_KNOWLEDGE_BASE: gql`
mutation ($projectId: ID!, $knowledgeBaseId: ID!) {
  deleteKnowledgeBase(projectId: $projectId, knowledgeBaseId: $knowledgeBaseId) {
    ok
  }
}
`,
  DELETE_TERM: gql`
mutation ($projectId: ID!, $termId: ID!) {
  deleteTerm(projectId: $projectId, termId: $termId) {
    ok
  }
}
`,
  BLACKLIST_TERM: gql`
mutation ($projectId: ID!, $termId: ID!) {
  blacklistTerm(projectId: $projectId, termId: $termId) {
    ok
  }
}
`,
  UPDATE_KNOWLEDGE_BASE: gql`
mutation ($projectId: ID!, $knowledgeBaseId: ID!, $name: String, $description: String) {
  updateKnowledgeBase(projectId: $projectId, knowledgeBaseId: $knowledgeBaseId, name: $name, description: $description) {
    ok
  }
}
`,
  UPDATE_TERM: gql`
mutation ($projectId: ID!, $termId: ID!, $value: String, $comment: String) {
  updateTerm(projectId: $projectId, termId: $termId, value: $value, comment: $comment) {
    ok
  }
}
`,
  PASTE_TERM: gql`
mutation ($projectId: ID!, $knowledgeBaseId: ID!, $values: String!, $split: String, $delete: Boolean) {
  pasteKnowledgeTerms(projectId: $projectId, knowledgeBaseId: $knowledgeBaseId, values: $values, split: $split, delete: $delete) {
    ok
  }
}

`,
};
