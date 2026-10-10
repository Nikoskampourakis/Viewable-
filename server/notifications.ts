/**
 * Web Push & Background Polling Service
 * Manages VAPID credentials, browser push subscriptions, and triggers poll checks
 * for watched accounts and keywords.
 */

import webpush from 'web-push';
import { Request, Response } from 'express';
import { providerRouter } from './router.ts';

// Configure Web Push VAPID
const vapidPublic = process.env.VAPID_PUBLIC_KEY || 'BF7_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notifications@viewable.local';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
} catch {
  // Graceful fallback if keys are placeholders
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  watchedAccounts: string[];
  watchedKeywords: string[];
  lastCheckedTweetIds: Record<string, string>;
  quietHours?: {
    enabled: boolean;
    startHour: number; // e.g. 22
    endHour: number;   // e.g. 8
  };
}

const activeSubscriptions = new Map<string, PushSubscriptionData>();

export function getVapidPublicKey() {
  return vapidPublic;
}

export function saveSubscription(sub: PushSubscriptionData) {
  activeSubscriptions.set(sub.endpoint, sub);
}

export function removeSubscription(endpoint: string) {
  activeSubscriptions.delete(endpoint);
}

export async function handleCronPoll(_req: Request, res: Response) {
  const currentHour = new Date().getHours();
  let notificationsSent = 0;

  for (const [endpoint, sub] of activeSubscriptions.entries()) {
    // Check quiet hours
    if (sub.quietHours?.enabled) {
      const { startHour, endHour } = sub.quietHours;
      const isQuiet = startHour > endHour
        ? currentHour >= startHour || currentHour < endHour
        : currentHour >= startHour && currentHour < endHour;

      if (isQuiet) continue;
    }

    // Poll each watched account
    for (const username of sub.watchedAccounts) {
      try {
        const timeline = await providerRouter.getTimeline(username, { limit: 5 });
        if (timeline.tweets.length > 0) {
          const latestTweet = timeline.tweets[0];
          const lastSeenId = sub.lastCheckedTweetIds[username];

          if (lastSeenId && latestTweet.id !== lastSeenId) {
            // New tweet detected!
            const payload = JSON.stringify({
              title: `@${username} posted`,
              body: latestTweet.text.slice(0, 120),
              url: `/#/tweet/${latestTweet.id}`,
            });

            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: sub.keys,
                },
                payload
              );
              notificationsSent++;
            } catch (err: any) {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                // Subscription has expired
                activeSubscriptions.delete(endpoint);
              }
            }
          }

          // Update last seen
          sub.lastCheckedTweetIds[username] = latestTweet.id;
        }
      } catch {
        // Individual account timeline fail, continue
      }
    }
  }

  res.json({
    status: 'ok',
    activeSubscriptions: activeSubscriptions.size,
    notificationsSent,
    timestamp: new Date().toISOString(),
  });
}
