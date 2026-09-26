import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/email.queue';
import './queues/email.worker';
import { initElasticsearch } from './config/elasticsearch';
import apiRoutes from './routes/api.routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Bull-Board Queue Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// Application REST APIs
app.use('/api', apiRoutes);

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`BullMQ dashboard running on http://localhost:${PORT}/admin/queues`);
  initElasticsearch().catch((err) => console.log('Elasticsearch init info:', err.message));
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process.`);
  } else {
    console.error('Server error:', error.message);
  }
});
