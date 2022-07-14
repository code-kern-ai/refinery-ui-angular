import { gql } from 'apollo-angular';

export const queries = {
  TERMS_BY_KNOWLEDGE_BASE_ID: gql`
    query ($projectId: ID!, $knowledgeBaseId: ID!) {
        termsByKnowledgeBaseId(projectId: $projectId, knowledgeBaseId: $knowledgeBaseId) {
        id
        value
        comment
        blacklisted
      }
    }
  `,
  KNOWLEDGE_BASE_BY_PROJECT_ID: gql`
  query ($projectId: ID!) {
    knowledgeBasesByProjectId(projectId: $projectId) {
        id 
        name
        description
        termCount
    }
  }
`,
  KNOWLEDGE_BASE_BY_KNOWLEDGE_BASE_ID: gql`
  query ($projectId: ID!, $knowledgeBaseId: ID!) {
    knowledgeBaseByKnowledgeBaseId(projectId: $projectId, knowledgeBaseId: $knowledgeBaseId) {
        id 
        name
        description
    }
  }
`,

  EXPORT_LIST: gql`
  query ($projectId: ID!, $listId: ID!) {
    exportKnowledgeBase(projectId: $projectId, listId: $listId) 
  }
  `,

};
