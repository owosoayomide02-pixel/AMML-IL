export type WebHit = {
  title: string;
  url: string;
  snippet: string;
};

const INTERNAL_ONLY =
  /^(what('s| is)? )?(this month|last month|our |my )?(revenue|stock|unpaid|alerts?|best sellers?|dead stock|running low|how many|inventory value)/i;

export function needsWebBrowse(question: string) {
  const q = question.toLowerCase();
  const askingWhatIs = /\bwhat is\b/.test(q) && !/\b(this month|last month|our |running low|best seller)/.test(q);
  if (
    askingWhatIs ||
    /browse|search the web|look up|look it up|on the (web|internet)|google|news|datasheet|equivalent|alternative part|lead time|typical price|market price|worldwide|nigeria market|black market|cbn|who makes|explain/.test(q)
  ) {
    return true;
  }
  if (INTERNAL_ONLY.test(q) && !/market|nigeria|web|news|typical|browse/.test(q)) {
    return false;
  }
  return /siemens|schneider|omron|abb|mitsubishi|allen.?bradley|relay|contactor|vfd|inverter|plc|hmi|sensor|encoder/.test(q);
}

export function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (/^(127|10)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function extractHits(markdown: string): WebHit[] {
  const hits: WebHit[] = [];
  const seen = new Set<string>();
  const link = /\[([^\]]{3,120})\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = link.exec(markdown)) && hits.length < 5) {
    const title = match[1].replace(/\s+/g, " ").trim();
    const url = match[2];
    if (!isSafePublicUrl(url) || seen.has(url) || /duckduckgo\.com|jina\.ai/i.test(url)) continue;
    seen.add(url);
    const around = markdown.slice(Math.max(0, match.index - 80), match.index + 220).replace(/\s+/g, " ").trim();
    hits.push({ title, url, snippet: around.slice(0, 220) });
  }
  return hits;
}

async function readPublicText(url: string) {
  if (!isSafePublicUrl(url)) return "";
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) return "";
  return (await response.text()).replace(/\s+/g, " ").trim().slice(0, 2500);
}

async function duckDuckGo(query: string): Promise<WebHit[]> {
  const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };
  const hits: WebHit[] = [];
  if (payload.AbstractText && payload.AbstractURL) {
    hits.push({
      title: payload.Heading || "Summary",
      url: payload.AbstractURL,
      snippet: payload.AbstractText.slice(0, 280),
    });
  }
  for (const topic of payload.RelatedTopics ?? []) {
    if (!topic.Text || !topic.FirstURL || hits.length >= 4) continue;
    hits.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, snippet: topic.Text.slice(0, 220) });
  }
  return hits;
}

async function wikipedia(query: string): Promise<WebHit[]> {
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=2&namespace=0&format=json&origin=*`,
    { signal: AbortSignal.timeout(5000), cache: "no-store" },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as [string, string[], string[], string[]];
  const titles = payload[1] ?? [];
  const snippets = payload[2] ?? [];
  const urls = payload[3] ?? [];
  return titles.slice(0, 2).map((title, index) => ({
    title,
    url: urls[index] ?? "",
    snippet: snippets[index] || title,
  })).filter((hit) => hit.url);
}

export async function browseWeb(query: string): Promise<{ hits: WebHit[]; notes: string }> {
  const cleaned = query.replace(/\s+/g, " ").trim().slice(0, 180);
  if (!cleaned) return { hits: [], notes: "" };

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${cleaned} Nigeria industrial automation`)}`;
  const [jinaText, ddg, wiki] = await Promise.all([
    readPublicText(searchUrl).catch(() => ""),
    duckDuckGo(cleaned).catch(() => []),
    wikipedia(cleaned).catch(() => []),
  ]);

  const hits = [...extractHits(jinaText), ...ddg, ...wiki]
    .filter((hit, index, all) => hit.url && all.findIndex((row) => row.url === hit.url) === index)
    .slice(0, 5);

  let notes = jinaText.slice(0, 1200);
  if (hits[0] && isSafePublicUrl(hits[0].url) && hits[0].snippet.length < 80) {
    const page = await readPublicText(hits[0].url).catch(() => "");
    if (page) notes = `${hits[0].title}: ${page.slice(0, 900)}`;
  }

  return { hits, notes };
}

export function formatWebHits(hits: WebHit[]) {
  if (!hits.length) return "No public web results were retrieved.";
  return hits.map((hit, index) => `${index + 1}. ${hit.title} — ${hit.snippet} (${hit.url})`).join("\n");
}
