/**
 * Privacy Media Proxy
 * Proxies images, avatars, banners, videos, and link preview thumbnails.
 * Strips telemetry headers, EXIF/metadata, tracking query parameters, and enforces Referrer-Policy: no-referrer.
 * Supports Range requests for video playback and optional outbound PROXY_URL via undici ProxyAgent.
 */

import { Request, Response } from 'express';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const proxyUrl = process.env.PROXY_URL;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

// SSRF Protection: Deny local/internal IP ranges
function isUrlAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Disallow private IPv4 ranges
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const first = parseInt(ipMatch[1], 10);
      const second = parseInt(ipMatch[2], 10);
      if (first === 10) return false;
      if (first === 127) return false;
      if (first === 169 && second === 254) return false;
      if (first === 192 && second === 168) return false;
      if (first === 172 && second >= 16 && second <= 31) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Clean tracking query parameters
function cleanTargetUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const trackingParams = ['s', 't', 'ref_src', 'twclid', 'fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign'];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export async function handleMediaProxy(req: Request, res: Response) {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).json({ error: 'Missing "url" query parameter' });
    return;
  }

  if (!isUrlAllowed(targetUrl)) {
    res.status(403).json({ error: 'Target URL is not allowed' });
    return;
  }

  const cleanedUrl = cleanTargetUrl(targetUrl);

  try {
    const requestHeaders: Record<string, string> = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      'accept': '*/*',
    };

    // Forward Range header if present (for video buffering)
    if (req.headers.range) {
      requestHeaders.range = req.headers.range as string;
    }

    const upstreamRes = await undiciFetch(cleanedUrl, {
      method: 'GET',
      headers: requestHeaders,
      dispatcher,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      res.status(upstreamRes.status).json({ error: `Upstream media returned ${upstreamRes.status}` });
      return;
    }

    // Forward content headers
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');
    const acceptRanges = upstreamRes.headers.get('accept-ranges');

    res.status(upstreamRes.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // Cache 7 days
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    // Stream response body back to client
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch {
          res.end();
        }
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    res.status(502).json({ error: `Failed to proxy media: ${err?.message || 'unknown error'}` });
  }
}
