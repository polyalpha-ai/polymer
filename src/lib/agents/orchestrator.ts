import { planAgent } from './planner';
import { researchBothSides, conductFollowUpResearch } from './researcher';
import { criticAgent } from './critic';
import { analystAgent, analystAgentWithCritique, MarketFn } from './analyst';
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

  // Step 3: FIRST RESEARCH CYCLE - Initial evidence gathering
  console.log(`🔍 === RESEARCH CYCLE 1: Initial Evidence Gathering ===`);
  const { pro: initialPro, con: initialCon } = await researchBothSides(question, plan, marketData);
  console.log(`🔎 Initial research complete: pro=${initialPro.length}, con=${initialCon.length}`);

  // Step 4: CRITIC ANALYSIS - Identify gaps and provide feedback
  console.log(`🧪 === CRITIC ANALYSIS: Identifying Gaps ===`);
  const critique = await criticAgent(question, initialPro, initialCon);
  console.log(`🧪 Critic analysis complete:`);
  console.log(`   - Missing evidence areas: ${critique.missing.length}`);
  console.log(`   - Duplication flags: ${critique.duplicationFlags.length}`);
  console.log(`   - Data concerns: ${critique.dataConcerns.length}`);
  console.log(`   - Follow-up searches suggested: ${critique.followUpSearches.length}`);
  console.log(`   - Correlation adjustments: ${Object.keys(critique.correlationAdjustments).length}`);

  // Step 5: SECOND RESEARCH CYCLE - Targeted follow-up research
  let finalPro = initialPro;
  let finalCon = initialCon;
  let neutralEvidence: Evidence[] = [];
  
  if (critique.followUpSearches.length > 0) {
    console.log(`🔍 === RESEARCH CYCLE 2: Targeted Follow-up Research ===`);
    const followUpResults = await conductFollowUpResearch(question, critique.followUpSearches, marketData);
    
    // Merge follow-up evidence with initial evidence
    finalPro = [...initialPro, ...followUpResults.pro];
    finalCon = [...initialCon, ...followUpResults.con];
    neutralEvidence = followUpResults.neutral;
    
    console.log(`🔎 Follow-up research complete: +${followUpResults.pro.length} pro, +${followUpResults.con.length} con, +${followUpResults.neutral.length} neutral`);
    console.log(`🔎 Total evidence: pro=${finalPro.length}, con=${finalCon.length}, neutral=${neutralEvidence.length}`);
  } else {
    console.log(`🔍 === RESEARCH CYCLE 2: Skipped (no gaps identified) ===`);
  }

  // Merge all evidence lists
  const allEvidence: Evidence[] = [...finalPro, ...finalCon, ...neutralEvidence];

  // Step 6: ENHANCED ANALYSIS - Apply critic feedback to aggregation
  console.log(`🧮 === ENHANCED ANALYSIS: Applying Critic Feedback ===`);
  const { pNeutral, pAware, influence, clusters, filteredEvidence } = await analystAgentWithCritique(
    question, p0, allEvidence, critique, opts.rhoByCluster, polymarketFn
  );
  console.log(
    `🧮 Enhanced aggregation complete: pNeutral=${pNeutral.toFixed(3)}, pAware=${pAware !== undefined ? pAware.toFixed(3) : 'n/a'}, influenceItems=${influence.length}, clusters=${clusters.length}`
  );
  console.log(`🧮 Evidence used in final analysis: ${filteredEvidence?.length || allEvidence.length}/${allEvidence.length} (${allEvidence.length - (filteredEvidence?.length || allEvidence.length)} filtered out)`);

  // Use filtered evidence for final card if available
  const finalEvidence = filteredEvidence || allEvidence;

  // Step 7: Build report text via model
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
      ...finalEvidence.flatMap(e => e.urls),
      `https://polymarket.com/event/${opts.polymarketSlug}`
    ],
    markdownReport: markdown,
  });
}
