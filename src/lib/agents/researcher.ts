import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Evidence } from '../forecasting/types';
import { valyuDeepSearchTool, valyuWebSearchTool } from '../tools/valyu_search';

const model = openai('gpt-5');

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
  items: z.array(EvidenceItemSchema).min(1).max(5).describe('Array of evidence items found through research')
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

Evidence Classification Rules:
- Type A (2.0 cap): Primary data, official documents, direct measurements
- Type B (1.6 cap): Secondary sources with good methodology, expert analysis  
- Type C (0.8 cap): Tertiary sources that cite primary/secondary sources
- Type D (0.3 cap): Weak sources, speculation, unverified claims

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
      model,
      system: 'You are an expert researcher. Use the available search tools to thoroughly investigate the question and gather relevant information.',
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
      model,
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
