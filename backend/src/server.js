import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes.js';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('DATABASE_URL and JWT_SECRET must be configured. Copy .env.example to .env.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', router);
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: 'Unexpected server error.' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log('MeterMind API listening on port ' + port));
