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
