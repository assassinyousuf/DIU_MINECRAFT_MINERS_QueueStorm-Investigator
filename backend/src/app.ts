import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import analyzeRouter from './routes/analyze';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve React frontend (local dev / EC2 only — Lambda uses API GW)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/analyze-ticket', analyzeRouter);

// SPA fallback
app.get('*', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).json({ status: 'ok', message: 'QueueStorm Investigator API' });
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
