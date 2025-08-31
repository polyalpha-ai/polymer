import { aggregateNeutral, blendMarket } from '../forecasting/aggregator';
import { Evidence } from '../forecasting/types';
import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

export interface MarketSnapshot { 
  probability: number; 
  asOf: string; 
  source?: string; 
}

export type MarketFn = (question: string) => Promise<MarketSnapshot>;

export async function analystAgent(
  question: string, 
  p0: number, 
  evidence: Evidence[], 
  rhoByCluster?: Record<string, number>, 
  marketFn?: MarketFn
) {
  const { pNeutral, influence, clusters } = aggregateNeutral(p0, evidence, rhoByCluster);
  let pAware: number | undefined;
  
  if (marketFn) {
    const m = await marketFn(question);   // firewall: used only here after neutral
    pAware = blendMarket(pNeutral, m.probability, 0.1);
  }
  
  return { pNeutral, pAware, influence, clusters };
}

const RelevanceSchema = z.object({
  relevantEvidence: z.array(z.object({
    id: z.string(),
    isRelevant: z.boolean(),
    reasoning: z.string().describe('Brief explanation of why this evidence is or isn\'t relevant to the question')
  }))
});

async function analyzeTopicRelevance(evidence: Evidence[], question: string): Promise<string[]> {
  if (evidence.length === 0) return [];
  
  const model = openai('gpt-5');
  
  try {
    const { object } = await generateObject({
      model,
      schema: RelevanceSchema,
      system: `You are a relevance analyzer. Determine if evidence items are directly relevant to the prediction question.

RELEVANCE CRITERIA:
- Evidence must be about the SAME subject/entity as the question
- Evidence must relate to the SAME context or domain as the question  
- Evidence must provide information that could reasonably influence the prediction

IRRELEVANT EXAMPLES:
- Medical studies when question is about politics
- Safety research when question is about financial markets
- General statistics unrelated to the specific subject
- Evidence about different people, companies, or contexts`,
      prompt: `Question: "${question}"

Analyze each piece of evidence for relevance:

${evidence.map(e => `
ID: ${e.id}
Claim: "${e.claim}"
URLs: ${e.urls.join(', ') || 'None'}
`).join('\n')}

For each evidence item, determine if it's directly relevant to answering the prediction question. Be strict - only mark as relevant if the evidence could reasonably influence the probability of the specific outcome being predicted.`
    });

    const relevantIds = object.relevantEvidence
      .filter(item => item.isRelevant)
      .map(item => item.id);

    // Log any filtered evidence for debugging
    const filteredItems = object.relevantEvidence.filter(item => !item.isRelevant);
    if (filteredItems.length > 0) {
      console.log('🔍 Topic relevance analysis:');
      filteredItems.forEach(item => {
        console.log(`  ❌ ${item.id}: ${item.reasoning}`);
      });
    }

    return relevantIds;
  } catch (error) {
    console.warn('⚠️  Topic relevance analysis failed, keeping all evidence:', error);
    return evidence.map(e => e.id); // Fallback: keep all evidence if analysis fails
  }
}

export async function analystAgentWithCritique(
  question: string, 
  p0: number, 
  evidence: Evidence[], 
  critique: { duplicationFlags: string[]; correlationAdjustments: Record<string, number>; dataConcerns: string[] },
  rhoByCluster?: Record<string, number>, 
  marketFn?: MarketFn
) {
  // Step 1: Filter out flagged evidence based on critic feedback
  let filteredEvidence = evidence.filter(e => {
    // Remove evidence flagged as duplicates or with severe data concerns
    const isDuplicate = critique.duplicationFlags.some(flag => 
      e.id.includes(flag) || e.originId.includes(flag)
    );
    const hasDataConcerns = critique.dataConcerns.some(concern => 
      e.claim.toLowerCase().includes(concern.toLowerCase()) ||
      e.originId.toLowerCase().includes(concern.toLowerCase())
    );
    
    return !isDuplicate && !hasDataConcerns;
  });

  // Step 2: Use LLM to analyze topic relevance
  console.log(`🔍 Analyzing topic relevance for ${filteredEvidence.length} evidence items...`);
  const relevantIds = await analyzeTopicRelevance(filteredEvidence, question);
  
  // Filter to only include relevant evidence
  const topicFilteredEvidence = filteredEvidence.filter(e => relevantIds.includes(e.id));
  const offTopicCount = filteredEvidence.length - topicFilteredEvidence.length;
  
  if (offTopicCount > 0) {
    console.warn(`🚨 Filtered out ${offTopicCount} off-topic evidence items via LLM analysis`);
    filteredEvidence = topicFilteredEvidence;
  }

  // Step 3: Apply correlation adjustments from critic
  const adjustedRho = { ...rhoByCluster };
  for (const [clusterId, adjustment] of Object.entries(critique.correlationAdjustments)) {
    adjustedRho[clusterId] = adjustment;
  }

  console.log(`📊 Analyst applying critic feedback: filtered ${evidence.length - filteredEvidence.length} evidence items total, adjusted ${Object.keys(critique.correlationAdjustments).length} correlations`);

  const { pNeutral, influence, clusters } = aggregateNeutral(p0, filteredEvidence, adjustedRho);
  let pAware: number | undefined;
  
  if (marketFn) {
    const m = await marketFn(question);   // firewall: used only here after neutral
    pAware = blendMarket(pNeutral, m.probability, 0.1);
  }
  
  return { pNeutral, pAware, influence, clusters, filteredEvidence };
}
