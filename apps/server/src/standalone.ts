import { serve } from '@hono/node-server';
import app from './index';

process.env.NODE_ENV ||= 'development';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';

console.log('================================================================================');
console.log('MEDCORE REVENUE CYCLE MANAGEMENT: LOCAL BACKEND SERVER');
console.log(`Port: ${port} | Host: ${host}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('================================================================================\n');

serve(
  {
    fetch: app.fetch,
    port,
    hostname: host
  },
  (info) => {
    console.log(`[READY] MedCore Hono API listening on http://${info.address}:${info.port}`);
    console.log(`[READY] Healthcheck: http://localhost:${info.port}/api/health`);
    console.log(`[READY] Encounters:  http://localhost:${info.port}/api/v1/encounters`);
  }
);
