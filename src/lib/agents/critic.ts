import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { Evidence } from '../forecasting/types';

const model = openai('gpt-5');

export const CritiqueSchema = z.object({
  missing: z.array(z.string()).describe('missed disconfirming evidence or failure modes'),
  duplicationFlags: z.array(z.string()).describe('evidence ids suspected duplicate wiring'),
  dataConcerns: z.array(z.string()).describe('measurement or selection bias risks'),
  followUpSearches: z.array(z.object({
    query: z.string().describe('specific search query to fill gaps'),
    rationale: z.string().describe('why this search is needed'),
    side: z.enum(['FOR', 'AGAINST', 'NEUTRAL']).describe('which side this search targets')
  })).max(5).describe('targeted searches to fill identified gaps'),
  correlationAdjustments: z.record(z.string(), z.number().min(0).max(1)).describe('suggested correlation adjustments for evidence clusters'),
  confidenceIssues: z.array(z.string()).describe('factors that should reduce confidence in the forecast')
});
export type Critique = z.infer<typeof CritiqueSchema>;

export async function criticAgent(question: string, pro: Evidence[], con: Evidence[]): Promise<Critique> {
  const { object } = await generateObject({
    model,
    schema: CritiqueSchema,
    system: `You are the Skeptic. Your job is to identify gaps, biases, and quality issues in the evidence, then provide actionable feedback to improve the analysis.`,
    prompt: `Question: ${question}

EVIDENCE ANALYSIS:
Supporting Evidence (${pro.length} items):
${pro.map(e => `- ${e.id}: ${e.claim} (Type ${e.type}, Verifiability: ${e.verifiability})`).join('\n')}

Contradicting Evidence (${con.length} items):
${con.map(e => `- ${e.id}: ${e.claim} (Type ${e.type}, Verifiability: ${e.verifiability})`).join('\n')}

CRITICAL ANALYSIS TASKS:
1. Identify missing evidence types or perspectives that would strengthen the analysis
2. Flag potential duplicates by examining originId patterns and claim similarity
3. Note data quality concerns, selection biases, or methodological issues
4. Suggest specific follow-up searches to fill critical gaps (max 5)
5. Recommend correlation adjustments for evidence clusters that seem related (use originId as key, correlation value 0-1 as value)
6. Identify factors that should reduce confidence in the final forecast

FOLLOW-UP SEARCH GUIDELINES:
- Target specific gaps in evidence coverage
- Focus on major financial/news outlets: Reuters, Bloomberg, WSJ, Financial Times, Associated Press
- Add temporal constraints: include "2025" or "recent" for current events
- Avoid restrictive site: searches for government domains (whitehouse.gov, congress.gov) - they rarely yield results
- Use broad keyword searches rather than exact phrase matching
- Balance FOR/AGAINST perspectives
- Prioritize searches likely to find Type A/B evidence over Type C/D

CORRELATION ADJUSTMENTS FORMAT:
- Use originId as key (e.g., "reuters-001", "bloomberg-002")
- Use correlation value 0-1 as value (e.g., 0.8 for highly correlated sources)
- Example: {"reuters-001": 0.8, "bloomberg-002": 0.6}

Return comprehensive JSON analysis matching the exact schema.`,
  });
  return object;
}
