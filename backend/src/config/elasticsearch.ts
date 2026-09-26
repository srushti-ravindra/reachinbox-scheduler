import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
});

export const initElasticsearch = async () => {
  try {
    const indexExists = await esClient.indices.exists({ index: 'emails' });
    if (!indexExists) {
      await esClient.indices.create({
        index: 'emails',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: { type: 'text' },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledFor: { type: 'date' },
              sentAt: { type: 'date' },
            },
          },
        },
      });
      console.log('Elasticsearch index "emails" initialized.');
    } else {
      console.log('Elasticsearch connected to port 9200 cleanly.');
    }
  } catch (error: any) {
    console.error('Elasticsearch connection info:', error.message || error);
  }
};
