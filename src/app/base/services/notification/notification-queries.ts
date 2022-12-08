import { gql } from 'apollo-angular';

export const queries = {
  NOTIFICATIONS_BY_USER: gql`
  query {
    notificationsByUserId {
    message
    level
    id
  }
}
`,
  NOTIFICATIONS: gql`
  query {
    notifications(userFilter: true){
      id
      level
      title
      important
      type
      message
      createdAt
      docs
      state
      projectId
      page
    }
  }
`,

};
