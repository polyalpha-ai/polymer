import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Evidence } from '../forecasting/types';
import { valyuDeepSearchTool, valyuWebSearchTool } from '../tools/valyu_search';
import { getPolarTrackedModel } from '../polar-llm-strategy';

// Get model dynamically to use current context
const getModel = () => getPolarTrackedModel('gpt-5');

interface MarketData {
  market_facts: {
    question: string;
    close_time?: string | number;
    resolution_source?: string;
    volume?: number;
    liquidity?: number;
  };
  market_state_now: Array<{
    token_id: string;
    outcome?: string;
    bid?: number | null;
    ask?: number | null;
    mid?: number | null;
  }>;
  history: Array<{
    token_id: string;
    points: Array<{ t: number; p: number }>;
  }>;
}

const EvidenceItemSchema = z.object({
  id: z.string().describe('Unique identifier for this piece of evidence'),
  claim: z.string().describe('Specific factual claim or finding'),
  polarity: z.enum(['1', '-1']).describe('Whether this supports (1) or contradicts (-1) the outcome'),
  type: z.enum(['A', 'B', 'C', 'D']).describe('Evidence quality: A=primary data, B=secondary analysis, C=tertiary sources, D=weak sources'),
  publishedAt: z.string().optional().describe('Publication date in ISO format'),
  urls: z.array(z.string().url()).min(0).describe('Source URLs from search results (empty array if no sources)'),
  originId: z.string().describe('Source identifier for deduplication'),
  firstReport: z.boolean().default(false).describe('Whether this is the first report of this information'),
  verifiability: z.number().min(0).max(1).describe('How verifiable this claim is (0-1)'),
  corroborationsIndep: z.number().int().min(0).describe('Number of independent corroborations'),
  consistency: z.number().min(0).max(1).describe('Internal logical consistency (0-1)')
});

const EvidenceSchema = z.object({
  items: z.array(EvidenceItemSchema).min(0).max(10).describe('Array of evidence items found through research (up to 10)')
});

// URL normalization and evidence deduplication helpers
function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    // lower-case host and strip www.
    const host = (u.hostname || '').toLowerCase().replace(/^www\./, '');
    u.hostname = host;
    // remove hash
    u.hash = '';
    // remove common tracking params
    const toDelete = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','igsh','mc_cid','mc_eid','ref'];
    toDelete.forEach(k => u.searchParams.delete(k));
    // sort params (stable order)
    const params = Array.from(u.searchParams.entries()).sort(([a],[b]) => a.localeCompare(b));
    u.search = params.length ? '?' + params.map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
    // remove trailing slash (except root)
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.replace(/\/+$/,'');
    // remove default ports
    if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) u.port = '';
    return u.toString();
  } catch {
    return null;
  }
}

function hostFromUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return (u.hostname || '').toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function dedupeAndNormalizeEvidence(items: Evidence[]): Evidence[] {
  const seenUrls = new Set<string>();
  const hostCounts: Record<string, number> = {};
  const DOMAIN_CAP = 5;
  const result: Evidence[] = [];
  for (const item of items) {
    const normalizedUrls = (item.urls || [])
      .map(normalizeUrl)
      .filter((x): x is string => Boolean(x));
    // Unique normalized URLs per item
    const uniqueUrls = Array.from(new Set(normalizedUrls));
    // Skip if any URL already seen (duplicate source)
    const isDup = uniqueUrls.some(u => seenUrls.has(u));
    if (isDup) continue;
    // Mark URLs as seen
    uniqueUrls.forEach(u => seenUrls.add(u));
    // Compute originId from host of first URL if available
    const originHost = uniqueUrls.length ? hostFromUrl(uniqueUrls[0]) : null;
    const originId = originHost || item.originId || 'unknown';
    // Enforce per-domain cap (max DOMAIN_CAP items per domain)
    if (originHost) {
      const count = hostCounts[originHost] || 0;
      if (count >= DOMAIN_CAP) {
        continue; // skip items beyond cap
      }
      hostCounts[originHost] = count + 1;
    }
    result.push({
      ...item,
      urls: uniqueUrls,
      originId,
    });
  }
  return result;
}

// Summarize tool findings to a bounded-length digest to avoid context overflows
// Side-aware: bias the summary toward the research target (FOR/AGAINST/NEUTRAL)
async function summarizeFindings(raw: string, maxChars = 2000, question?: string, side?: 'FOR' | 'AGAINST' | 'NEUTRAL'): Promise<string> {
  try {
    const seed = raw?.slice(0, Math.min(raw.length, 8000)) || '';
    const sideDirective = (() => {
      if (side === 'FOR') {
        return 'Target: PRO side. Emphasize findings that SUPPORT the outcome. Prioritize directly supportive facts and high-credibility sources. Omit or briefly note contradicting points only if essential.';
      } else if (side === 'AGAINST') {
        return 'Target: CON side. Emphasize findings that CONTRADICT the outcome. Prioritize directly disconfirming facts and high-credibility sources. Omit or briefly note supporting points only if essential.';
      } else {
        return 'Target: NEUTRAL. Provide a factual, topic-focused summary without taking a side.';
      }
    })();
    const { text } = await generateText({
      model: getModel(),
      system: 'You compress research notes into a concise, high-signal summary. Preserve key facts, entities, dates, numbers. No fluff.',
      prompt: `Question: ${question ?? 'n/a'}\n${sideDirective}\nBe strictly ON-TOPIC to the question. Remove unrelated domains or entities.\nCompress the following research findings into a tight bullet list with short headings. Max ${maxChars} characters.\n\n---\n${seed}`,
    });
    return text.slice(0, maxChars);
  } catch {
    return (raw || '').slice(0, maxChars);
  }
}

function makeResearchPrompt(question: string, plan: { subclaims: string[]; searchSeeds: string[] }, side: 'FOR' | 'AGAINST', marketData?: MarketData) {
  const marketContext = marketData ? `
Market Context:
- Current market price: ${marketData.market_state_now[0]?.mid ? (marketData.market_state_now[0].mid * 100).toFixed(1) + '%' : 'N/A'}
- Volume: $${marketData.market_facts.volume?.toLocaleString() || 'N/A'}
- Liquidity: $${marketData.market_facts.liquidity?.toLocaleString() || 'N/A'}
` : '';

  return `You are the ${side === 'FOR' ? 'Pro-Researcher' : 'Con-Researcher'}.
Goal: Find **independent** sources ${side === 'FOR' ? 'supporting' : 'contradicting'} the outcome.

${marketContext}
Question: ${question}
Subclaims to investigate: ${plan.subclaims.join(' | ')}
Search seeds: ${plan.searchSeeds.join(' | ')}

Research Process:
1. Use valyuDeepSearch or valyuWebSearch to find relevant information for each subclaim
2. Evaluate each piece of evidence for quality and reliability
3. Return your findings as structured JSON matching the required schema

QUERY CONSTRUCTION RULES (Initial Cycle):
- DO NOT prefix queries with outlet names (e.g., do not start queries with "Reuters ", "Bloomberg ", "WSJ ").
- DO NOT use site: filters.
- Include the current year "2025" in each query to bias toward fresh results.
- Use natural language with specific entities/contexts from the question and subclaims.
- Prefer phrasing like "<entity> <topic> 2025 status" over brand-led queries.

ENHANCED Evidence Classification Rules:
- Type A (2.0 cap): PRIMARY SOURCES
  * Official documents, press releases, regulatory filings
  * Direct quotes from named officials
  * First-hand reporting with on-the-record sources
  * Government data, court documents, official transcripts
  
- Type B (1.6 cap): HIGH-QUALITY SECONDARY SOURCES  
  * Major news outlets with verified sourcing (Reuters, Bloomberg, WSJ, FT, AP)
  * Expert analysis with clear methodology
  * Academic papers, think tank reports with data
  * Investigative journalism with multiple sources
  
- Type C (0.8 cap): STANDARD SECONDARY SOURCES
  * Reputable news outlets citing primary sources
  * Industry publications with good track records
  * Opinion pieces by recognized experts
  * Reports that reference primary data
  
- Type D (0.3 cap): WEAK OR SPECULATIVE SOURCES
  * Unverified social media, blogs, forums
  * Anonymous sources without corroboration
  * Opinion pieces without supporting data
  * Rumor, speculation, or hearsay

Scoring Guidelines:
- Verifiability: 1.0 if you can recompute/verify numbers, else estimate 0-1
- Consistency: Rate internal logical coherence from 0-1
- Polarity: Use "${side === 'FOR' ? '1' : '-1'}" for all evidence
- Deduplicate: Use same originId for syndicated content

IMPORTANT: After conducting your research using the search tools, you MUST return a JSON object with an "items" array containing 2-5 evidence objects. Each evidence object must have all required fields: id, claim, polarity, type, urls, originId, firstReport, verifiability, corroborationsIndep, consistency.

If search tools return no results or limited results, you should still return a JSON object with whatever evidence you can construct from your knowledge, but mark it appropriately with lower verifiability scores.

ALWAYS end your response with valid JSON matching the schema, regardless of search results.`;
}

async function conductResearch(
  question: string,
  plan: { subclaims: string[]; searchSeeds: string[] },
  side: 'FOR' | 'AGAINST',
  marketData?: MarketData,
  sessionId?: string
): Promise<Evidence[]> {
  try {
    const prompt = makeResearchPrompt(question, plan, side, marketData);
    
    // Step 1: Use tools to gather information (without structured output)
    const searchResult = await generateText({
      model: getModel(),
      system: `You are an expert researcher. CRITICAL: Stay strictly on-topic for "${question}".
- Craft search queries that are SPECIFIC to the question's subject matter
- AVOID generic searches that could return irrelevant results
- For political questions: include specific names, countries, political entities
- For market questions: include specific companies, products, or financial instruments  
- REJECT any search results about unrelated topics (medicine, safety, general studies)
- Don't add 'site:' prefixes to queries - use natural language`,
      prompt: `${prompt}\n\nUse the search tools to find relevant information, then summarize your findings. STAY ON TOPIC.`,
      tools: {
        valyuDeepSearch: valyuDeepSearchTool,
        valyuWebSearch: valyuWebSearchTool,
      }
    });

    // Step 2: Summarize findings to bound context, then generate structured evidence
    const summarized = await summarizeFindings(searchResult.text, 2000, question, side);
    const evidencePrompt = `Based on your research findings, create structured evidence for the ${side} side.

Research Summary (compressed): ${summarized}

CRITICAL REQUIREMENT: ALL evidence must be directly relevant to the question "${question}". 
- REJECT evidence about unrelated topics (medicine, safety, general statistics)
- ONLY include evidence specifically about the subject and context in the question
- If your search found off-topic results, mark them as irrelevant and don't include them

Now create 4-8 high-quality evidence items in JSON format matching this schema (prioritize Type A/B, recent 2024-2025 sources):
{
  "items": [
    {
      "id": "string",
      "claim": "string", 
      "polarity": "${side === 'FOR' ? '1' : '-1'}",
      "type": "A|B|C|D",
      "urls": ["string"] // or [] if no sources,
      "originId": "string",
      "firstReport": boolean,
      "verifiability": number,
      "corroborationsIndep": number,
      "consistency": number
    }
  ]
}

Return ONLY the JSON object, no other text.`;

    const structuredResult = await generateText({
      model: getModel(),
      system: 'You are a structured data generator. Return only valid JSON matching the exact schema provided.',
      prompt: evidencePrompt,
      experimental_output: Output.object({
        schema: EvidenceSchema,
      }),
    });

    // Access the structured output, normalize, and dedupe
    if (structuredResult.experimental_output) {
      const itemsRaw = structuredResult.experimental_output.items.map((item: any) => ({
        ...item,
        polarity: item.polarity === '1' ? 1 : -1 // Convert string to number
      }));
      const items = dedupeAndNormalizeEvidence(itemsRaw as Evidence[]);
      return items;
    } else {
      console.warn(`No structured output generated for ${side} research`);
      return [];
    }
  } catch (error) {
    console.error(`Error in ${side} research:`, error);
    return []; // Return empty array instead of throwing
  }
}



export async function researchBothSides(
  question: string,
  plan: { subclaims: string[]; searchSeeds: string[] },
  marketData?: MarketData,
  sessionId?: string
) {
  console.log('🔍 Starting research with GPT-5 and Valyu search tools...');
  
  // Conduct research for both sides in parallel
  const [pro, con] = await Promise.all([
    conductResearch(question, plan, 'FOR', marketData, sessionId),
    conductResearch(question, plan, 'AGAINST', marketData, sessionId)
  ]);
  
  console.log(`✅ Research complete: ${pro.length} pro evidence, ${con.length} con evidence`);
  
  return { pro, con };
}

export async function conductFollowUpResearch(
  question: string,
  followUpSearches: Array<{ query: string; rationale: string; side: 'FOR' | 'AGAINST' | 'NEUTRAL' }>,
  marketData?: MarketData,
  sessionId?: string
): Promise<{ pro: Evidence[]; con: Evidence[]; neutral: Evidence[] }> {
  console.log(`🔍 Starting follow-up research with ${followUpSearches.length} targeted searches...`);
  
  const results = await Promise.all(
    followUpSearches.map(async (search) => {
      const evidence = await conductTargetedResearch(question, search, marketData, sessionId);
      return { side: search.side, evidence };
    })
  );

  const pro = results.filter(r => r.side === 'FOR').flatMap(r => r.evidence);
  const con = results.filter(r => r.side === 'AGAINST').flatMap(r => r.evidence);
  const neutral = results.filter(r => r.side === 'NEUTRAL').flatMap(r => r.evidence);

  console.log(`✅ Follow-up research complete: ${pro.length} pro, ${con.length} con, ${neutral.length} neutral evidence`);
  
  return { pro, con, neutral };
}

// Helper function for automatic evidence type classification
function classifyEvidenceType(claim: string, urls: string[], sourceDescription: string): {
  suggestedType: 'A' | 'B' | 'C' | 'D';
  verifiabilityBonus: number;
  explanation: string;
} {
  let score = 0;
  let explanation = '';
  let verifiabilityBonus = 0;

  // URL-based classification
  const highQualityDomains = ['reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'apnews.com', 'ap.org'];
  const officialDomains = ['.gov', 'federalreserve.gov', 'sec.gov'];
  
  const hasHighQualitySource = urls.some(url => highQualityDomains.some(domain => url.includes(domain)));
  const hasOfficialSource = urls.some(url => officialDomains.some(domain => url.includes(domain)));
  
  if (hasOfficialSource) {
    score += 3;
    explanation += 'Official government source (+3). ';
  } else if (hasHighQualitySource) {
    score += 2;
    explanation += 'High-quality news source (+2). ';
  }

  // Content-based classification
  const primaryIndicators = ['official statement', 'press release', 'according to documents', 'on the record', 'regulatory filing'];
  const secondaryIndicators = ['expert analysis', 'investigation found', 'data shows', 'study reveals'];
  const tertiaryIndicators = ['sources say', 'reportedly', 'according to reports'];
  const weakIndicators = ['alleged', 'rumored', 'speculation', 'unconfirmed'];

  const text = claim.toLowerCase() + ' ' + sourceDescription.toLowerCase();
  
  if (primaryIndicators.some(indicator => text.includes(indicator))) {
    score += 2;
    explanation += 'Primary source indicators (+2). ';
  } else if (secondaryIndicators.some(indicator => text.includes(indicator))) {
    score += 1;
    explanation += 'Secondary source indicators (+1). ';
  } else if (tertiaryIndicators.some(indicator => text.includes(indicator))) {
    score -= 1;
    explanation += 'Tertiary source indicators (-1). ';
  } else if (weakIndicators.some(indicator => text.includes(indicator))) {
    score -= 2;
    explanation += 'Weak source indicators (-2). ';
  }

  // Recency bonus
  if (text.includes('2025') || text.includes('recent')) {
    verifiabilityBonus = 0.1;
    explanation += 'Recent publication (+0.1 verifiability). ';
  }

  // Determine type based on total score
  let suggestedType: 'A' | 'B' | 'C' | 'D';
  if (score >= 4) {
    suggestedType = 'A';
  } else if (score >= 2) {
    suggestedType = 'B';
  } else if (score >= 0) {
    suggestedType = 'C';
  } else {
    suggestedType = 'D';
  }

  return { suggestedType, verifiabilityBonus, explanation };
}

async function conductTargetedResearch(
  question: string,
  search: { query: string; rationale: string; side: 'FOR' | 'AGAINST' | 'NEUTRAL' },
  marketData?: MarketData,
  sessionId?: string
): Promise<Evidence[]> {
  try {
    const marketContext = marketData ? `
Market Context:
- Question: ${marketData.market_facts.question}
- Current Price: ${marketData.market_state_now[0]?.mid || 'N/A'}
- Volume: ${marketData.market_facts.volume || 'N/A'}
` : '';

    const prompt = `You are conducting targeted research to fill a specific gap in the analysis.

${marketContext}
Original Question: ${question}
Search Query: ${search.query}
Rationale: ${search.rationale}
Target Side: ${search.side}

Use the search tools to find specific evidence related to this query. Focus on high-quality, verifiable sources that address the identified gap.

QUERY CONSTRUCTION RULES (Targeted):
- DO NOT prefix queries with outlet names (e.g., avoid starting with "Reuters ", "Bloomberg ", "WSJ ").
- DO NOT use site: filters.
- Consider adding the current year "2025" to queries when freshness is critical.
- Use natural language with precise entities/contexts from the rationale.

After searching, return 1-3 high-quality evidence items that directly address the search rationale.`;

    // Step 1: Use tools to gather information
    const searchResult = await generateText({
      model: getModel(),
      system: 'You are an expert researcher conducting targeted searches to fill specific analytical gaps.',
      prompt: `${prompt}\n\nUse the search tools to find relevant information, then summarize your findings.`,
      tools: {
        valyuDeepSearch: valyuDeepSearchTool,
        valyuWebSearch: valyuWebSearchTool,
      }
    });

    // Step 2: Summarize findings to bound context, then generate structured evidence
    const summarized = await summarizeFindings(searchResult.text, 2000, question, search.side);
    const evidencePrompt = `Based on your targeted research findings, create 2-4 high-quality evidence items.

Research Summary (compressed): ${summarized}
Target Side: ${search.side}

Create evidence items in JSON format matching this schema:
{
  "items": [
    {
      "id": "string",
      "claim": "string", 
      "polarity": "${search.side === 'FOR' ? '1' : '-1'}",
      "type": "A|B|C|D",
      "urls": ["string"] // or [] if no sources,
      "originId": "string",
      "firstReport": boolean,
      "verifiability": number,
      "corroborationsIndep": number,
      "consistency": number
    }
  ]
}

Focus on quality over quantity. Ensure each evidence item directly addresses the search rationale.

AUTOMATIC CLASSIFICATION HINTS:
- If URL contains: reuters.com, bloomberg.com, wsj.com, ft.com, ap.org → likely Type B
- If URL contains: .gov, official press releases, regulatory filings → likely Type A  
- If source mentions "according to documents", "official statement", "on the record" → likely Type A/B
- If source uses words like "sources say", "reportedly", "alleged" → likely Type C/D
- Recent publication (2025) gets +0.1 verifiability bonus
- Multiple independent sources mentioned gets +1 corroborationsIndep

Return ONLY the JSON object, no other text.`;

    const structuredResult = await generateText({
      model: getModel(),
      system: 'You are a structured data generator. Return only valid JSON matching the exact schema provided.',
      prompt: evidencePrompt,
      experimental_output: Output.object({
        schema: EvidenceSchema,
      }),
    });

    // Access the structured output, normalize, and dedupe
    if (structuredResult.experimental_output) {
      const itemsRaw = structuredResult.experimental_output.items.map((item: any) => ({
        ...item,
        polarity: search.side === 'NEUTRAL' ? 0 : (item.polarity === '1' ? 1 : -1) // Convert string to number, handle NEUTRAL
      }));
      const items = dedupeAndNormalizeEvidence(itemsRaw as Evidence[]);
      return items;
    } else {
      console.warn(`No structured output generated for targeted research: ${search.query}`);
      return [];
    }
  } catch (error) {
    console.error(`Error in targeted research for "${search.query}":`, error);
    return [];
  }
}
