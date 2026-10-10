/**
 * Viewable Backend Server
 * Express application mounting the provider router, privacy media proxy,
 * Web Push service, PDF exporter, and Vite middleware.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { providerRouter } from './server/router.ts';
import { handleMediaProxy } from './server/proxy.ts';
import { handlePdfExport } from './server/pdf-export.ts';
import { fetchNewsFeeds } from './server/news.ts';
import { getVapidPublicKey, saveSubscription, removeSubscription, handleCronPoll } from './server/notifications.ts';
import { handleAIAnalysis } from './server/ai.ts';
import { handleOAuthTokenExchange, handleCreateTweet } from './server/posting.ts';
import { ProviderOptions } from './server/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Strict Privacy & Security Headers (No IP logging, no tracking)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' ws: wss:; font-src 'self' data:;"
  );
  next();
});

// Helper to extract BYO session cookies from request headers
function extractProviderOptions(req: Request): ProviderOptions {
  const authToken = req.headers['x-byo-auth-token'] as string | undefined;
  const ct0 = req.headers['x-byo-ct0'] as string | undefined;
  const cursor = req.query.cursor as string | undefined;

  return {
    byoSession: authToken && ct0 ? { authToken, ct0 } : undefined,
    cursor,
    bypassCache: req.query.fresh === 'true',
  };
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check endpoint showing live status of each provider
app.get('/api/health', (_req: Request, res: Response) => {
  const healthReport = providerRouter.getHealthReport();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: healthReport,
  });
});

// Reorder provider priorities
app.post('/api/providers/priority', (req: Request, res: Response) => {
  const { priorityOrder } = req.body;
  if (Array.isArray(priorityOrder)) {
    providerRouter.setPriorityOrder(priorityOrder);
  }
  res.json({ status: 'ok', providers: providerRouter.getHealthReport() });
});

// Tweet Detail
app.get('/api/tweet/:id', async (req: Request, res: Response) => {
  try {
    const options = extractProviderOptions(req);
    const tweet = await providerRouter.getTweet(req.params.id, options);
    res.json(tweet);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch tweet' });
  }
});

// Thread & Replies
app.get('/api/thread/:id', async (req: Request, res: Response) => {
  try {
    const options = extractProviderOptions(req);
    const thread = await providerRouter.getReplies(req.params.id, options);
    res.json(thread);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch thread' });
  }
});

// User Profile
app.get('/api/profile/:username', async (req: Request, res: Response) => {
  try {
    const options = extractProviderOptions(req);
    const profile = await providerRouter.getProfile(req.params.username, options);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch user profile' });
  }
});

// User Timeline
app.get('/api/timeline/:username', async (req: Request, res: Response) => {
  try {
    const options = extractProviderOptions(req);
    const timeline = await providerRouter.getTimeline(req.params.username, options);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch timeline' });
  }
});

// Search
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      res.status(400).json({ error: 'Missing search query "q"' });
      return;
    }
    const options = extractProviderOptions(req);
    const results = await providerRouter.search(q, options);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Search failed' });
  }
});

// Privacy Media Proxy
app.get('/api/proxy/media', handleMediaProxy);

// PDF Export
app.post('/api/export/pdf', handlePdfExport);

// News Feeds & Clustering
app.get('/api/news', async (req: Request, res: Response) => {
  try {
    const customFeeds = req.query.feeds ? (req.query.feeds as string).split(',') : undefined;
    const newsData = await fetchNewsFeeds(customFeeds);
    res.json(newsData);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch news' });
  }
});

// Web Push credentials & registration
app.get('/api/push/vapid-key', (_req: Request, res: Response) => {
  res.json({ publicKey: getVapidPublicKey() });
});

app.post('/api/push/subscribe', (req: Request, res: Response) => {
  const subData = req.body;
  if (!subData?.endpoint) {
    res.status(400).json({ error: 'Missing subscription endpoint' });
    return;
  }
  saveSubscription(subData);
  res.json({ status: 'subscribed' });
});

app.post('/api/push/unsubscribe', (req: Request, res: Response) => {
  const { endpoint } = req.body;
  if (endpoint) removeSubscription(endpoint);
  res.json({ status: 'unsubscribed' });
});

// Background poller endpoint for Cloud Scheduler / Cron
app.all('/api/cron/poll', handleCronPoll);

// AI Thread Analyzer with Gemini 3.1 Pro HIGH thinking
app.post('/api/ai/analyze', handleAIAnalysis);

// Posting relay (OAuth 2.0 PKCE & Tweet creation)
app.post('/api/auth/token', handleOAuthTokenExchange);
app.post('/api/tweet/create', handleCreateTweet);

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC ASSET HOSTING
// -------------------------------------------------------------
async function startServer() {
  if (isDev) {
    // Mount Vite development middlewares in dev mode
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Viewable] Running on http://localhost:${port} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('[Viewable] Server startup error:', err);
  process.exit(1);
});
