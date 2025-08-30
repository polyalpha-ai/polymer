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
}



export async function runPolymarketForecastPipeline(opts: PolymarketOrchestratorOpts): Promise<ForecastCard> {
  // Step 1: Fetch initial Polymarket data to analyze market characteristics
  console.log(`🔍 Fetching Polymarket data for slug: ${opts.polymarketSlug}`);
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

  // Step 2: Auto-generate optimal parameters if not provided
  const optimalInterval = opts.historyInterval || selectOptimalHistoryInterval(initialData);
  const autoDrivers = opts.drivers && opts.drivers.length > 0 
    ? opts.drivers 
    : await generateDrivers(initialData);

  console.log(`📊 ${explainIntervalChoice(optimalInterval, initialData)}`);
  console.log(`🎯 Using drivers: ${autoDrivers.join(', ')}`);

  // Step 3: Fetch complete market data with optimal settings
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

  // Step 2: Plan the research based on the market question
  const plan = await planAgent(question);
  console.log(
    `🗺️  Plan generated: subclaims=${plan.subclaims.length}, seeds=${plan.searchSeeds.length}, variables=${plan.keyVariables.length}, criteria=${plan.decisionCriteria.length}`
  );

  // Step 3: Research both sides using web search and market data
  const { pro, con } = await researchBothSides(question, plan, marketData);
  console.log(`🔎 Research complete: pro=${pro.length}, con=${con.length}`);

  // Merge evidence lists
  const evidence: Evidence[] = [...pro, ...con];

  // Step 4: Skeptic pass (metadata only)
  await criticAgent(question, pro, con);
  console.log(`🧪 Critic pass completed.`);

  // Step 5: Aggregate (neutral; optional aware via marketFn)
  const { pNeutral, pAware, influence, clusters } = await analystAgent(
    question, p0, evidence, opts.rhoByCluster, polymarketFn
  );
  console.log(
    `🧮 Aggregation: pNeutral=${pNeutral.toFixed(3)}, pAware=${pAware !== undefined ? pAware.toFixed(3) : 'n/a'}, influenceItems=${influence.length}, clusters=${clusters.length}`
  );

  // Step 6: Build report text via model
  const markdown = await reporterAgent(question, p0, pNeutral, pAware, influence, clusters, autoDrivers);
  console.log(`📝 Report generated. length=${markdown.length} chars`);
  console.log(`⏱️  Total pipeline time: ${((Date.now() - t0)/1000).toFixed(1)}s`);

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
