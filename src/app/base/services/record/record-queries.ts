import { gql } from 'apollo-angular';

export const queries = {
  // GET_RECORDS: gql`
  //   query ($projectId: ID!, $cursor: String, $limit: Int) {
  //     allRecords(projectId: $projectId, first: $limit, after: $cursor) {
  //       pageInfo {
  //         hasNextPage
  //         startCursor
  //         endCursor
  //       }
  //       edges {
  //         cursor
  //         node {
  //           id
  //           category
  //           data
  //           lastChanged
  //           labelAssociations {
  //             edges {
  //               node {
  //                 confidence
  //                 name
  //                 source
  //                 label {
  //                   name
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // `,

  GET_NEXT_RECORD_ID: gql`
    query ($projectId: ID!, $accessStrategy: String!) {
      nextRecord(projectId: $projectId, accessStrategy: $accessStrategy) {
        id
      }
    }
  `,

  GET_RECORD_BY_RECORD_ID: gql`
  query ($projectId: ID!, $recordId: ID!) {
    recordByRecordId(projectId: $projectId, recordId: $recordId) {
      id
      data
      projectId
      category      
    }
  } 
  
  `,

  GET_RECORD_LABEL_ASSOCIATIONS: gql`
  query ($projectId: ID!, $recordId: ID!) {
    recordByRecordId(projectId: $projectId, recordId: $recordId) {
      id
      recordLabelAssociations {
        edges {
          node {
            id
            recordId
            labelingTaskLabelId
            sourceId
            sourceType
            returnType
            confidence
            createdAt
            createdBy
            tokenStartIdx
            tokenEndIdx
            isGoldStar
            user {
              id
              firstName
              lastName
              mail
            }
            informationSource {
              type
              returnType
              name
              description
              createdAt
              createdBy
            }
            labelingTaskLabel {
              id
              name
              color
              labelingTask {
                id
                name
                attribute {
                  id
                  name
                  relativePosition
                }
              }
            }
          }
        }
      }
    }
  }
  `,

  GET_LAST_ANNOTATED_RECORDS: gql`
    query ($projectId: ID!, $topN: Int!) {
      lastAnnotatedRecords(projectId: $projectId, topN: $topN) {
        id
        record {
          id
          data
          category
        }
        label {
          name
        }
        createdAt
        user {
          mail
        }
        source
      }
    }
  `,

  SEARCH_RECORDS_NEW: gql`
  query (
    $projectId: ID!
    $fieldToQuery: [String]
    $queryText: String
    $manual: [String]
    $programmatic: [String]
    $category: [String]
    $offset: Int
    $limit: Int
  ) {
    searchRecords(
      projectId: $projectId
      fieldToQuery: $fieldToQuery
      queryText: $queryText
      manual: $manual
      programmatic: $programmatic
      category: $category
      offset: $offset
      limit: $limit
    ) {
      id
      data
      category
    }
  }
`,

  SEARCH_RECORDS_EXTENDED: gql`
  query ($projectId: ID!, $filterData: [JSONString]!, $offset: Int, $limit: Int) {
    searchRecordsExtended(projectId: $projectId, filterData: $filterData, offset: $offset, limit: $limit) {
      queryLimit
      queryOffset
      fullCount
      sessionId
      recordList {
        recordData
      }
    }
  }
  
`,

  SEARCH_SIMILAR_RECORDS: gql`
  query ($projectId: ID!, $embeddingId: ID!, $recordId: ID!) {
    searchRecordsBySimilarity(projectId: $projectId, embeddingId: $embeddingId, recordId: $recordId) {
      queryLimit
      queryOffset
      fullCount
      sessionId
      recordList {
        recordData
      }
    }
  }
  `,


  GET_RECORDS_BY_STATIC_SLICE: gql`
  query ($projectId: ID!, $sliceId: ID!, $orderBy: JSONString, $offset: Int, $limit: Int) {
    recordsByStaticSlice(projectId: $projectId, sliceId: $sliceId,orderBy: $orderBy, offset: $offset, limit: $limit) {
      queryLimit
      queryOffset
      fullCount
      sessionId
      recordList {
        recordData
      }
    }
  }
`,
  GET_STATIC_DATA_SLICE_CURRENT_COUNT: gql`
  query ($projectId: ID!, $sliceId: ID!) {
    staticDataSlicesCurrentCount(projectId: $projectId, sliceId: $sliceId)
  }
`,

  SEARCH_RECORDS_BY_PROJECT_ID: gql`
    query (
      $projectId: String!
      $queryText: String!
      $manual: [String]
      $programmatic: [String]
      $after: Int
      $limit: Int
    ) {
      typesenseSearch(
        projectId: $projectId
        queryText: $queryText
        manual: $manual
        programmatic: $programmatic
        after: $after
        limit: $limit
      ) {
        records {
          category
          data
          id
          lastChanged
          labelAssociations {
            edges {
              node {
                source
                name
                confidence
                label {
                  id
                  name
                }
              }
            }
          }
        }
        pageInfo {
          startCursor
          endCursor
          hasNext
        }
      }
    }
  `,

  GET_TOKENIZED_RECORD: gql`
  query ($recordId: ID!){
    tokenizeRecord(recordId:$recordId) {
      recordId
      attributes {
        raw
        attribute {
          id
          name
        }      
        tokens {
          value
          idx
          posStart
          posEnd
          type
        }
      }
    }
  }
  `,
  GET_SESSION_BY_SESSION_ID: gql`
  query($projectId:ID!,$sessionId:ID!){
    userSessionBySessionId(projectId:$projectId,sessionId:$sessionId){
      id,
      sessionRecordIds
    }
  }
  `,

  RUN_RECORD_IDE: gql`
  query ($projectId: ID!, $recordId: ID!, $code: String!) {
    runRecordIde(projectId:$projectId, recordId:$recordId, code:$code)
  }
  `,

  IS_ANY_RECORD_MANUALLY_LABELED: gql`
  query($projectId:ID!){
    isAnyRecordManuallyLabeled(projectId:$projectId)
  }
  `
};
