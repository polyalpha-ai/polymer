import { aggregateNeutral, blendMarket } from '../forecasting/aggregator';
import { Evidence } from '../forecasting/types';

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

export async function analystAgentWithCritique(
  question: string, 
  p0: number, 
  evidence: Evidence[], 
  critique: { duplicationFlags: string[]; correlationAdjustments: Record<string, number>; dataConcerns: string[] },
  rhoByCluster?: Record<string, number>, 
  marketFn?: MarketFn
) {
  // Filter out flagged evidence based on critic feedback
  const filteredEvidence = evidence.filter(e => {
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

  // Apply correlation adjustments from critic
  const adjustedRho = { ...rhoByCluster };
  for (const [clusterId, adjustment] of Object.entries(critique.correlationAdjustments)) {
    adjustedRho[clusterId] = adjustment;
  }

  console.log(`📊 Analyst applying critic feedback: filtered ${evidence.length - filteredEvidence.length} evidence items, adjusted ${Object.keys(critique.correlationAdjustments).length} correlations`);

  const { pNeutral, influence, clusters } = aggregateNeutral(p0, filteredEvidence, adjustedRho);
  let pAware: number | undefined;
  
  if (marketFn) {
    const m = await marketFn(question);   // firewall: used only here after neutral
    pAware = blendMarket(pNeutral, m.probability, 0.1);
  }
  
  return { pNeutral, pAware, influence, clusters, filteredEvidence };
}
