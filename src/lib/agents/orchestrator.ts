import { planAgent } from './planner';
import { researchBothSides } from './researcher';
import { criticAgent } from './critic';
import { analystAgent, MarketFn } from './analyst';
import { reporterAgent } from './reporter';
import { generateDrivers } from './driver-generator';
import { selectOptimalHistoryInterval, explainIntervalChoice } from './interval-optimizer';
import { Evidence, ForecastCard } from '../forecasting/types';
import { makeForecastCard } from '../forecasting/reportCard';
import { buildLLMPayloadFromSlug } from '../tools/polymarket';


export interface PolymarketOrchestratorOpts {
  polymarketSlug: string;                       // Polymarket slug to analyze
  rhoByCluster?: Record<string, number>;
  drivers?: string[];
  historyInterval?: string;                     // e.g., '1d', '4h', '1h'
  withBooks?: boolean;                          // include order book data
  withTrades?: boolean;                         // include recent trades
  onProgress?: (step: string, details: any) => void;  // progress callback
}



export async function runPolymarketForecastPipeline(opts: PolymarketOrchestratorOpts): Promise<ForecastCard> {
  const { onProgress } = opts;
  
  // Step 1: Fetch initial Polymarket data to analyze market characteristics
  console.log(`🔍 Fetching Polymarket data for slug: ${opts.polymarketSlug}`);
  onProgress?.('fetch_initial', { 
    message: 'Fetching Polymarket data...', 
    slug: opts.polymarketSlug 
  });
  
  const t0 = Date.now();
  
  // First fetch with default interval to get market info
  const initialData = await buildLLMPayloadFromSlug(opts.polymarketSlug, {
    historyInterval: '1d',
    withBooks: false,
    withTrades: false,
  });
  
  console.log(
    `🧠 Initial market facts: question="${initialData.market_facts.question}", outcomes=${Object.keys(initialData.market_facts.token_map ?? {}).length}, historySeries=${initialData.history?.length ?? 0}`
  );
  
  onProgress?.('initial_data', {
    message: 'Market data retrieved',
    question: initialData.market_facts.question,
    outcomes: Object.keys(initialData.market_facts.token_map ?? {}).length,
    historySeries: initialData.history?.length ?? 0
  });

  // Step 2: Auto-generate optimal parameters if not provided
  onProgress?.('optimize_parameters', {
    message: 'Optimizing analysis parameters...'
  });
  
  const optimalInterval = opts.historyInterval || selectOptimalHistoryInterval(initialData);
  const autoDrivers = opts.drivers && opts.drivers.length > 0 
    ? opts.drivers 
    : await generateDrivers(initialData);

  console.log(`📊 ${explainIntervalChoice(optimalInterval, initialData)}`);
  console.log(`🎯 Using drivers: ${autoDrivers.join(', ')}`);
  
  onProgress?.('parameters_optimized', {
    message: 'Parameters optimized',
    interval: optimalInterval,
    drivers: autoDrivers,
    intervalExplanation: explainIntervalChoice(optimalInterval, initialData)
  });

  // Step 3: Fetch complete market data with optimal settings
  if (optimalInterval !== '1d' || opts.withBooks || opts.withTrades) {
    onProgress?.('fetch_complete_data', {
      message: 'Fetching complete market data with optimal settings...'
    });
  }
  
  const marketData = optimalInterval === '1d' && !opts.withBooks && !opts.withTrades
    ? initialData  // Reuse if settings match
    : await buildLLMPayloadFromSlug(opts.polymarketSlug, {
        historyInterval: optimalInterval,
        withBooks: opts.withBooks ?? true,
        withTrades: opts.withTrades ?? false,
      });
      
  console.log(
    `📥 Market data ready: reusedInitial=${marketData === initialData}, interval=${optimalInterval}, withBooks=${opts.withBooks ?? true}, withTrades=${opts.withTrades ?? false}`
  );
  
  onProgress?.('complete_data_ready', {
    message: 'Complete market data retrieved',
    reusedInitial: marketData === initialData,
    interval: optimalInterval,
    withBooks: opts.withBooks ?? true,
    withTrades: opts.withTrades ?? false
  });
  
  const question = marketData.market_facts.question;
  
  // Calculate prior from current market probability (if available)
  let p0 = 0.5; // default prior
  if (marketData.market_state_now && marketData.market_state_now.length > 0) {
    const firstOutcome = marketData.market_state_now[0];
    if (firstOutcome.mid !== null && firstOutcome.mid !== undefined) {
      p0 = Math.max(0.1, Math.min(0.9, firstOutcome.mid)); // clamp between 0.1 and 0.9
    }
  }
  console.log(`📈 Prior (p0) from market mid: ${p0.toFixed(3)}`);

  // Create market function that returns current Polymarket probability
  const polymarketFn: MarketFn = async () => {
    const currentPrice = marketData.market_state_now[0]?.mid || 0.5;
    return {
      probability: currentPrice,
      asOf: new Date().toISOString(),
      source: 'polymarket'
    };
  };

  // Step 4: Plan the research based on the market question
  onProgress?.('planning', {
    message: 'Planning research strategy...',
    question: question
  });
  
  const plan = await planAgent(question);
  console.log(
    `🗺️  Plan generated: subclaims=${plan.subclaims.length}, seeds=${plan.searchSeeds.length}, variables=${plan.keyVariables.length}, criteria=${plan.decisionCriteria.length}`
  );
  
  onProgress?.('plan_complete', {
    message: 'Research plan generated',
    subclaims: plan.subclaims.length,
    searchSeeds: plan.searchSeeds.length,
    variables: plan.keyVariables.length,
    criteria: plan.decisionCriteria.length,
    plan: {
      subclaims: plan.subclaims.slice(0, 3), // Show first 3 for preview
      searchSeeds: plan.searchSeeds.slice(0, 5), // Show first 5 for preview
    }
  });

  // Step 5: Research both sides using web search and market data
  onProgress?.('researching', {
    message: 'Researching evidence for both sides...',
    searchSeeds: plan.searchSeeds.length
  });
  
  const { pro, con } = await researchBothSides(question, plan, marketData);
  console.log(`🔎 Research complete: pro=${pro.length}, con=${con.length}`);
  
  onProgress?.('research_complete', {
    message: 'Evidence research completed',
    proEvidence: pro.length,
    conEvidence: con.length,
    urls: [...new Set([...pro.flatMap(p => p.urls), ...con.flatMap(c => c.urls)])].slice(0, 10) // Show first 10 unique URLs
  });

  // Merge evidence lists
  const evidence: Evidence[] = [...pro, ...con];

  // Step 6: Skeptic pass (metadata only)
  onProgress?.('criticism', {
    message: 'Running critical analysis...',
    evidenceCount: evidence.length
  });
  
  await criticAgent(question, pro, con);
  console.log(`🧪 Critic pass completed.`);
  
  onProgress?.('criticism_complete', {
    message: 'Critical analysis completed'
  });

  // Step 7: Aggregate (neutral; optional aware via marketFn)
  onProgress?.('aggregating', {
    message: 'Aggregating evidence and calculating probabilities...',
    evidenceItems: evidence.length
  });
  
  const { pNeutral, pAware, influence, clusters } = await analystAgent(
    question, p0, evidence, opts.rhoByCluster, polymarketFn
  );
  console.log(
    `🧮 Aggregation: pNeutral=${pNeutral.toFixed(3)}, pAware=${pAware !== undefined ? pAware.toFixed(3) : 'n/a'}, influenceItems=${influence.length}, clusters=${clusters.length}`
  );
  
  onProgress?.('aggregation_complete', {
    message: 'Probability aggregation completed',
    pNeutral: pNeutral,
    pAware: pAware,
    influenceItems: influence.length,
    clusters: clusters.length,
    topInfluences: influence.slice(0, 5).map(i => ({ evidenceId: i.evidenceId, logLR: i.logLR, deltaPP: i.deltaPP }))
  });

  // Step 8: Build report text via model
  onProgress?.('reporting', {
    message: 'Generating final report...',
    drivers: autoDrivers
  });
  
  const markdown = await reporterAgent(question, p0, pNeutral, pAware, influence, clusters, autoDrivers);
  console.log(`📝 Report generated. length=${markdown.length} chars`);
  console.log(`⏱️  Total pipeline time: ${((Date.now() - t0)/1000).toFixed(1)}s`);
  
  onProgress?.('report_complete', {
    message: 'Final report generated',
    reportLength: markdown.length,
    totalTime: ((Date.now() - t0)/1000).toFixed(1) + 's'
  });

  return makeForecastCard({
    question,
    p0,
    pNeutral,
    pAware,
    alpha: 0.1,
    drivers: autoDrivers,
    influence,
    clusters,
    provenance: [
      ...evidence.flatMap(e => e.urls),
      `https://polymarket.com/event/${opts.polymarketSlug}`
    ],
    markdownReport: markdown,
  });
}
