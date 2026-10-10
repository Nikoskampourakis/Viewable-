/**
 * Test Runner for Viewable
 * Validates normalizer schemas, circuit breaker state machine, and cache layer.
 */

import { normalizeSyndicationTweet, normalizeGraphQLTweet, cleanUrl } from '../normalizer.ts';
import { CircuitBreaker } from '../circuit-breaker.ts';
import { LRUCacheStore } from '../cache.ts';
import { RequestCoalescer } from '../queue.ts';

async function runTests() {
  console.log('[Test Suite] Running Viewable unit & fixture tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ ${name}`);
      failed++;
    }
  }

  // 1. URL cleaner
  const dirtyUrl = 'https://pbs.twimg.com/media/abc.jpg?format=jpg&name=orig&s=20&ref_src=twsrc';
  const cleaned = cleanUrl(dirtyUrl);
  assert(!cleaned.includes('ref_src') && !cleaned.includes('s=20'), 'cleanUrl strips tracking params');

  // 2. Syndication Normalizer Fixture
  const syndicationFixture = {
    id_str: '1899123456789012345',
    text: 'Exciting news from the team! Check it out.',
    created_at: '2026-03-10T12:00:00.000Z',
    user: {
      id_str: '44196397',
      name: 'Elon Musk',
      screen_name: 'elonmusk',
      profile_image_url_https: 'https://pbs.twimg.com/profile_images/normal.jpg',
      verified: true,
      followers_count: 175000000,
    },
    photos: [
      {
        url: 'https://pbs.twimg.com/media/rocket.jpg',
        width: 1200,
        height: 800,
      },
    ],
    favorite_count: 42000,
    retweet_count: 5500,
    reply_count: 1200,
  };

  const normalizedSyndication = normalizeSyndicationTweet(syndicationFixture);
  assert(normalizedSyndication.id === '1899123456789012345', 'Syndication: correctly extracts tweet ID');
  assert(normalizedSyndication.author.username === 'elonmusk', 'Syndication: extracts author username');
  assert(normalizedSyndication.media?.length === 1, 'Syndication: parses media list');
  assert(normalizedSyndication.stats.likes === 42000, 'Syndication: maps like count');

  // 3. GraphQL Normalizer Fixture
  const graphQLFixture = {
    entryId: 'tweet-998877665544332211',
    tweet: {
      legacy: {
        id_str: '998877665544332211',
        full_text: 'Deep learning breakthroughs in 2026',
        created_at: '2026-02-15T10:30:00.000Z',
        favorite_count: 8500,
        retweet_count: 1200,
      },
      core: {
        user_results: {
          result: {
            rest_id: '123456',
            legacy: {
              name: 'AI Research',
              screen_name: 'AIResearch',
              profile_image_url_https: 'https://pbs.twimg.com/ai_normal.jpg',
            },
          },
        },
      },
    },
  };

  const normalizedGraphQL = normalizeGraphQLTweet(graphQLFixture);
  assert(normalizedGraphQL !== null, 'GraphQL: maps legacy payload successfully');
  assert(normalizedGraphQL?.author.username === 'AIResearch', 'GraphQL: parses screen_name');

  // 4. Circuit Breaker State Machine
  const breaker = new CircuitBreaker({ failureThreshold: 2, baseTimeoutMs: 15 });
  assert(breaker.canExecute() === true, 'Circuit Breaker: starts CLOSED');
  breaker.recordFailure();
  assert(breaker.canExecute() === true, 'Circuit Breaker: remains CLOSED after 1 failure');
  breaker.recordFailure();
  assert(breaker.canExecute() === false, 'Circuit Breaker: transitions to OPEN after 2 failures');
  // Wait for timeout to half-open
  await new Promise((r) => setTimeout(r, 65));
  assert(breaker.canExecute() === true, 'Circuit Breaker: transitions to HALF-OPEN after timeout');
  breaker.recordSuccess();
  breaker.recordSuccess();
  assert(breaker.state === 'closed', 'Circuit Breaker: recovers to CLOSED after successful executions');

  // 5. LRU Cache Store
  const cache = new LRUCacheStore(2);
  await cache.set('a', 1, 10);
  await cache.set('b', 2, 10);
  assert((await cache.get('a')) === 1, 'Cache: retrieves key "a"');
  await cache.set('c', 3, 10); // Evicts 'b' because 'a' was accessed
  assert((await cache.get('b')) === null, 'Cache: evicts oldest key upon capacity limit');
  assert((await cache.get('c')) === 3, 'Cache: keeps recently inserted key "c"');

  // 6. Request Coalescing
  const coalescer = new RequestCoalescer();
  let executionCount = 0;
  const slowTask = async () => {
    executionCount++;
    await new Promise((r) => setTimeout(r, 20));
    return 'data';
  };
  const [res1, res2] = await Promise.all([
    coalescer.execute('test-key', slowTask),
    coalescer.execute('test-key', slowTask),
  ]);
  assert(res1 === 'data' && res2 === 'data', 'Coalescing: returns identical response to both callers');
  assert(executionCount === 1, 'Coalescing: executes the underlying promise only once');

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
