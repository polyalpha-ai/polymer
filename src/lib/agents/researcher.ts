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
  items: z.array(EvidenceItemSchema).min(0).max(5).describe('Array of evidence items found through research')
});

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
  marketData?: MarketData
): Promise<Evidence[]> {
  try {
    const prompt = makeResearchPrompt(question, plan, side, marketData);
    
    // Step 1: Use tools to gather information (without structured output)
    const searchResult = await generateText({
      model: getModel(),
      system: 'You are an expert researcher. Use the available search tools to thoroughly investigate the question and gather relevant information. when searching dont add site: to the search query',
      prompt: `${prompt}\n\nUse the search tools to find relevant information, then summarize your findings.`,
      tools: {
        valyuDeepSearch: valyuDeepSearchTool,
        valyuWebSearch: valyuWebSearchTool,
      },
    });

    // Step 2: Generate structured evidence based on search results
    const evidencePrompt = `Based on your research findings, create structured evidence for the ${side} side.

Research Summary: ${searchResult.text}

Now create 2-5 evidence items in JSON format matching this schema:
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

    // Access the structured output and convert polarity strings to numbers
    if (structuredResult.experimental_output) {
      const items = structuredResult.experimental_output.items.map((item: any) => ({
        ...item,
        polarity: item.polarity === '1' ? 1 : -1 // Convert string to number
      }));
      return items as Evidence[];
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
  marketData?: MarketData
) {
  console.log('🔍 Starting research with GPT-5 and Valyu search tools...');
  
  // Conduct research for both sides in parallel
  const [pro, con] = await Promise.all([
    conductResearch(question, plan, 'FOR', marketData),
    conductResearch(question, plan, 'AGAINST', marketData)
  ]);
  
  console.log(`✅ Research complete: ${pro.length} pro evidence, ${con.length} con evidence`);
  
  return { pro, con };
}

export async function conductFollowUpResearch(
  question: string,
  followUpSearches: Array<{ query: string; rationale: string; side: 'FOR' | 'AGAINST' | 'NEUTRAL' }>,
  marketData?: MarketData
): Promise<{ pro: Evidence[]; con: Evidence[]; neutral: Evidence[] }> {
  console.log(`🔍 Starting follow-up research with ${followUpSearches.length} targeted searches...`);
  
  const results = await Promise.all(
    followUpSearches.map(async (search) => {
      const evidence = await conductTargetedResearch(question, search, marketData);
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
  marketData?: MarketData
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

After searching, return 1-3 high-quality evidence items that directly address the search rationale.`;

    // Step 1: Use tools to gather information
    const searchResult = await generateText({
      model: getModel(),
      system: 'You are an expert researcher conducting targeted searches to fill specific analytical gaps.',
      prompt: `${prompt}\n\nUse the search tools to find relevant information, then summarize your findings.`,
      tools: {
        valyuDeepSearch: valyuDeepSearchTool,
        valyuWebSearch: valyuWebSearchTool,
      },
    });

    // Step 2: Generate structured evidence based on search results
    const evidencePrompt = `Based on your targeted research findings, create 1-3 high-quality evidence items.

Research Summary: ${searchResult.text}
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

    // Access the structured output and convert polarity strings to numbers
    if (structuredResult.experimental_output) {
      const items = structuredResult.experimental_output.items.map((item: any) => ({
        ...item,
        polarity: search.side === 'NEUTRAL' ? 0 : (item.polarity === '1' ? 1 : -1) // Convert string to number, handle NEUTRAL
      }));
      return items as Evidence[];
    } else {
      console.warn(`No structured output generated for targeted research: ${search.query}`);
      return [];
    }
  } catch (error) {
    console.error(`Error in targeted research for "${search.query}":`, error);
    return [];
  }
}
