/**
 * News Feed Aggregation & Topic Clustering
 * Aggregates free RSS/Atom feeds, deduplicates with TF-IDF and cosine similarity,
 * and extracts trending topic clusters without external paid ML APIs.
 */

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedAt: string;
  category?: string;
  clusterId?: string;
}

export interface NewsTopicCluster {
  id: string;
  topic: string;
  articleCount: number;
  sources: string[];
  articles: NewsItem[];
  leadArticle: NewsItem;
}

const DEFAULT_FEEDS = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/rss' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Nature', url: 'https://www.nature.com/nature.rss' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
];

// Tokenizer & Stopword filter
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'from', 'as', 'be', 'has', 'have', 'had',
  'new', 'after', 'over', 'into', 'says', 'will', 'about', 'more', 'how', 'why', 'what', 'who'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

// Compute Term Frequency (TF)
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  for (const [k, v] of tf.entries()) {
    tf.set(k, v / tokens.length);
  }
  return tf;
}

// Cosine similarity between two TF vectors
function cosineSimilarity(tfA: Map<string, number>, tfB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of tfA.entries()) {
    normA += valA * valA;
    if (tfB.has(term)) {
      dotProduct += valA * (tfB.get(term) || 0);
    }
  }

  for (const valB of tfB.values()) {
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function fetchNewsFeeds(customFeedUrls?: string[]): Promise<{ items: NewsItem[]; clusters: NewsTopicCluster[]; trending: string[] }> {
  const feedsToFetch = customFeedUrls && customFeedUrls.length > 0
    ? customFeedUrls.map((url, i) => ({ name: `Feed ${i + 1}`, url }))
    : DEFAULT_FEEDS;

  const rawItems: NewsItem[] = [];

  await Promise.all(
    feedsToFetch.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { 'user-agent': 'ViewableBot/1.0 News Reader' },
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) return;
        const xml = await res.text();

        // Regex parser for RSS items
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match;
        let count = 0;

        while ((match = itemRegex.exec(xml)) !== null && count < 15) {
          const content = match[1];
          const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
          const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/i);
          const descMatch = content.match(/<description>([\s\S]*?)<\/description>/i);
          const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

          const cleanStr = (s?: string) =>
            s ? s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : '';

          const title = cleanStr(titleMatch?.[1]);
          const link = cleanStr(linkMatch?.[1]);
          const summary = cleanStr(descMatch?.[1]);
          const pubDate = pubDateMatch ? cleanStr(pubDateMatch[1]) : new Date().toISOString();

          if (title && link) {
            rawItems.push({
              id: `news-${Buffer.from(link).toString('base64').slice(0, 16)}`,
              title,
              link,
              summary: summary.slice(0, 280),
              source: feed.name,
              publishedAt: pubDate,
            });
            count++;
          }
        }
      } catch {
        // Individual feed timeout or parse error
      }
    })
  );

  // Cluster stories with TF-IDF similarity threshold > 0.35
  const itemVectors = rawItems.map((item) => ({
    item,
    tokens: tokenize(`${item.title} ${item.summary}`),
    tf: computeTF(tokenize(`${item.title} ${item.summary}`)),
    clusterIndex: -1,
  }));

  const clusters: { topicTokens: string[]; articles: NewsItem[] }[] = [];

  for (let i = 0; i < itemVectors.length; i++) {
    const current = itemVectors[i];
    let bestClusterIdx = -1;
    let highestSim = 0;

    for (let c = 0; c < clusters.length; c++) {
      const clusterArticles = clusters[c].articles;
      // Compare against lead article
      const leadTokens = tokenize(`${clusterArticles[0].title} ${clusterArticles[0].summary}`);
      const leadTf = computeTF(leadTokens);
      const sim = cosineSimilarity(current.tf, leadTf);
      if (sim > 0.32 && sim > highestSim) {
        highestSim = sim;
        bestClusterIdx = c;
      }
    }

    if (bestClusterIdx !== -1) {
      clusters[bestClusterIdx].articles.push(current.item);
      current.item.clusterId = `cluster-${bestClusterIdx}`;
    } else {
      const newClusterIdx = clusters.length;
      clusters.push({
        topicTokens: current.tokens.slice(0, 4),
        articles: [current.item],
      });
      current.item.clusterId = `cluster-${newClusterIdx}`;
    }
  }

  // Format clusters
  const formattedClusters: NewsTopicCluster[] = clusters
    .filter((c) => c.articles.length > 0)
    .sort((a, b) => b.articles.length - a.articles.length)
    .map((c, idx) => {
      const lead = c.articles[0];
      const sources = Array.from(new Set(c.articles.map((a) => a.source)));
      // Generate topic name from dominant words
      const words = tokenize(c.articles.map((a) => a.title).join(' '));
      const wordCounts = new Map<string, number>();
      words.forEach((w) => wordCounts.set(w, (wordCounts.get(w) || 0) + 1));
      const topWords = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' & ');

      return {
        id: `cluster-${idx}`,
        topic: topWords || lead.title.slice(0, 40),
        articleCount: c.articles.length,
        sources,
        articles: c.articles,
        leadArticle: lead,
      };
    });

  // Extract trending keywords
  const termFrequencies = new Map<string, number>();
  rawItems.forEach((item) => {
    tokenize(item.title).forEach((t) => {
      termFrequencies.set(t, (termFrequencies.get(t) || 0) + 1);
    });
  });

  const trending = Array.from(termFrequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([t, count]) => count >= 2 && t.length > 3)
    .slice(0, 10)
    .map(([t]) => `#${t.charAt(0).toUpperCase() + t.slice(1)}`);

  return {
    items: rawItems,
    clusters: formattedClusters,
    trending,
  };
}
