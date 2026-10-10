/**
 * Posting & Account Connection Relay
 * Relays OAuth 2.0 PKCE token exchanges and tweet creation to X API v2.
 * All tokens remain stored exclusively on the user's client; the backend never stores credentials.
 */

import { Request, Response } from 'express';

export async function handleOAuthTokenExchange(req: Request, res: Response) {
  try {
    const { code, codeVerifier, redirectUri, clientId } = req.body;

    if (!code || !codeVerifier || !clientId) {
      res.status(400).json({ error: 'Missing code, codeVerifier, or clientId' });
      return;
    }

    const bodyParams = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri || `${req.protocol}://${req.get('host')}/oauth/callback`,
      code_verifier: codeVerifier,
    });

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      res.status(tokenRes.status).json({ error: `OAuth token exchange failed: ${errText}` });
      return;
    }

    const tokenData = await tokenRes.json();
    // Return tokens directly to client
    res.json(tokenData);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to exchange token: ${err?.message}` });
  }
}

export async function handleCreateTweet(req: Request, res: Response) {
  try {
    const userBearer = req.headers.authorization;
    if (!userBearer) {
      res.status(401).json({ error: 'Missing user Bearer token in Authorization header' });
      return;
    }

    const { text, replyToTweetId, quoteTweetId, poll } = req.body;
    if (!text && !poll) {
      res.status(400).json({ error: 'Tweet text or poll is required' });
      return;
    }

    const payload: any = { text: text || '' };

    if (replyToTweetId) {
      payload.reply = { in_reply_to_tweet_id: replyToTweetId };
    }

    if (quoteTweetId) {
      payload.quote_tweet_id = quoteTweetId;
    }

    if (poll && poll.options?.length >= 2) {
      payload.poll = {
        options: poll.options.map((o: any) => o.label || String(o)),
        duration_minutes: poll.durationMinutes || 1440,
      };
    }

    const createRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: userBearer,
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      res.status(createRes.status).json({ error: `Tweet creation failed: ${errText}` });
      return;
    }

    const data = await createRes.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Tweet creation failed: ${err?.message}` });
  }
}
