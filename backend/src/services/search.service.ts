import { esClient } from '../config/elasticsearch';

export class SearchService {
  static async indexEmail(email: any) {
    // Non-blocking background index operation
    esClient
      .index({
        index: 'emails',
        id: email.id,
        body: {
          id: email.id,
          userId: email.userId,
          senderEmail: email.senderEmail,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledFor: email.scheduledFor,
          sentAt: email.sentAt,
        },
      })
      .then(() => esClient.indices.refresh({ index: 'emails' }))
      .catch((err) => {
        // Non-blocking notice
      });
  }

  static async searchEmails(userId: string, query: string, status?: string) {
    const mustQueries: any[] = [{ term: { userId } }];

    if (query) {
      mustQueries.push({
        multi_match: {
          query,
          fields: ['recipientEmail', 'subject', 'body'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (status) {
      mustQueries.push({ term: { status } });
    }

    try {
      const response = await esClient.search({
        index: 'emails',
        body: {
          query: { bool: { must: mustQueries } },
          sort: [{ scheduledFor: { order: 'desc' } }],
        },
      });
      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      return [];
    }
  }
}
