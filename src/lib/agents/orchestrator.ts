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
    response: {
      subclaims: plan.subclaims,
      searchSeeds: plan.searchSeeds,
      keyVariables: plan.keyVariables,
      decisionCriteria: plan.decisionCriteria
    }
  });

  // Step 5: FIRST RESEARCH CYCLE - Initial evidence gathering
  onProgress?.('researching', {
    message: 'Starting initial evidence research...',
    searchSeeds: plan.searchSeeds.length
  });
  
  console.log(`🔍 === RESEARCH CYCLE 1: Initial Evidence Gathering ===`);
  const { pro: initialPro, con: initialCon } = await researchBothSides(question, plan, marketData);
  console.log(`🔎 Initial research complete: pro=${initialPro.length}, con=${initialCon.length}`);
  
  onProgress?.('initial_research_complete', {
    message: 'Initial evidence research completed',
    proEvidence: initialPro.length,
    conEvidence: initialCon.length,
    urls: [...new Set([...initialPro.flatMap(p => p.urls), ...initialCon.flatMap(c => c.urls)])].slice(0, 10),
    response: {
      proEvidence: initialPro.map(e => ({ claim: e.claim, type: e.type, polarity: e.polarity, urls: e.urls })),
      conEvidence: initialCon.map(e => ({ claim: e.claim, type: e.type, polarity: e.polarity, urls: e.urls }))
    }
  });

  // Step 6: CRITIC ANALYSIS - Identify gaps and provide feedback
  onProgress?.('criticism', {
    message: 'Running critical analysis to identify gaps...',
    evidenceCount: initialPro.length + initialCon.length
  });
  
  console.log(`🧪 === CRITIC ANALYSIS: Identifying Gaps ===`);
  const critique = await criticAgent(question, initialPro, initialCon);
  console.log(`🧪 Critic analysis complete:`);
  console.log(`   - Missing evidence areas: ${critique.missing.length}`);
  console.log(`   - Duplication flags: ${critique.duplicationFlags.length}`);
  console.log(`   - Data concerns: ${critique.dataConcerns.length}`);
  console.log(`   - Follow-up searches suggested: ${critique.followUpSearches.length}`);
  console.log(`   - Correlation adjustments: ${Object.keys(critique.correlationAdjustments).length}`);

  onProgress?.('criticism_complete', {
    message: 'Critical analysis completed',
    missingAreas: critique.missing.length,
    followUpSearches: critique.followUpSearches.length,
    duplicationFlags: critique.duplicationFlags.length,
    dataConcerns: critique.dataConcerns.length,
    response: {
      missing: critique.missing,
      followUpSearches: critique.followUpSearches,
      duplicationFlags: critique.duplicationFlags,
      dataConcerns: critique.dataConcerns,
      correlationAdjustments: critique.correlationAdjustments
    }
  });

  // Step 7: SECOND RESEARCH CYCLE - Targeted follow-up research
  let finalPro = initialPro;
  let finalCon = initialCon;
  let neutralEvidence: Evidence[] = [];
  
  if (critique.followUpSearches.length > 0) {
    onProgress?.('followup_research', {
      message: 'Conducting targeted follow-up research...',
      followUpSearches: critique.followUpSearches.length
    });
    
    console.log(`🔍 === RESEARCH CYCLE 2: Targeted Follow-up Research ===`);
    const followUpResults = await conductFollowUpResearch(question, critique.followUpSearches, marketData);
    
    // Merge follow-up evidence with initial evidence
    finalPro = [...initialPro, ...followUpResults.pro];
    finalCon = [...initialCon, ...followUpResults.con];
    neutralEvidence = followUpResults.neutral;
    
    console.log(`🔎 Follow-up research complete: +${followUpResults.pro.length} pro, +${followUpResults.con.length} con, +${followUpResults.neutral.length} neutral`);
    console.log(`🔎 Total evidence: pro=${finalPro.length}, con=${finalCon.length}, neutral=${neutralEvidence.length}`);
    
    onProgress?.('followup_research_complete', {
      message: 'Follow-up research completed',
      additionalPro: followUpResults.pro.length,
      additionalCon: followUpResults.con.length,
      neutralEvidence: followUpResults.neutral.length,
      totalPro: finalPro.length,
      totalCon: finalCon.length,
      response: {
        additionalProEvidence: followUpResults.pro.map(e => ({ claim: e.claim, type: e.type, polarity: e.polarity, urls: e.urls })),
        additionalConEvidence: followUpResults.con.map(e => ({ claim: e.claim, type: e.type, polarity: e.polarity, urls: e.urls })),
        neutralEvidence: followUpResults.neutral.map(e => ({ claim: e.claim, type: e.type, urls: e.urls })),
        totalProEvidence: finalPro.map(e => ({ claim: e.claim, type: e.type, polarity: e.polarity, urls: e.urls })),
        totalConEvidence: finalCon.map(e => ({ claim: e.claim, type: e.type, polarity: e.polarity, urls: e.urls }))
      }
    });
  } else {
    console.log(`🔍 === RESEARCH CYCLE 2: Skipped (no gaps identified) ===`);
    onProgress?.('followup_research_skipped', {
      message: 'Follow-up research skipped - no gaps identified'
    });
  }

  // Merge all evidence lists
  const allEvidence: Evidence[] = [...finalPro, ...finalCon, ...neutralEvidence];

  // Step 8: ENHANCED ANALYSIS - Apply critic feedback to aggregation
  onProgress?.('aggregating', {
    message: 'Aggregating evidence with critic feedback...',
    totalEvidence: allEvidence.length
  });
  
  console.log(`🧮 === ENHANCED ANALYSIS: Applying Critic Feedback ===`);
  const { pNeutral, pAware, influence, clusters, filteredEvidence } = await analystAgentWithCritique(
    question, p0, allEvidence, critique, opts.rhoByCluster, polymarketFn
  );
  console.log(
    `🧮 Enhanced aggregation complete: pNeutral=${pNeutral.toFixed(3)}, pAware=${pAware !== undefined ? pAware.toFixed(3) : 'n/a'}, influenceItems=${influence.length}, clusters=${clusters.length}`
  );
  console.log(`🧮 Evidence used in final analysis: ${filteredEvidence?.length || allEvidence.length}/${allEvidence.length} (${allEvidence.length - (filteredEvidence?.length || allEvidence.length)} filtered out)`);

  onProgress?.('aggregation_complete', {
    message: 'Enhanced probability aggregation completed',
    pNeutral: pNeutral,
    pAware: pAware,
    influenceItems: influence.length,
    clusters: clusters.length,
    evidenceUsed: filteredEvidence?.length || allEvidence.length,
    evidenceFiltered: allEvidence.length - (filteredEvidence?.length || allEvidence.length),
    topInfluences: influence.slice(0, 5).map(i => ({ evidenceId: i.evidenceId, logLR: i.logLR, deltaPP: i.deltaPP })),
    response: {
      pNeutral: pNeutral,
      pAware: pAware,
      influence: influence,
      clusters: clusters.map(c => ({
        clusterId: c.clusterId,
        size: c.size,
        rho: c.rho,
        mEff: c.mEff,
        meanLLR: c.meanLLR
      })),
      evidenceFiltered: filteredEvidence ? allEvidence.filter(e => !filteredEvidence.some(fe => fe.id === e.id)) : []
    }
  });

  // Use filtered evidence for final card if available
  const finalEvidence = filteredEvidence || allEvidence;

  // Step 9: Build report text via model
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
    totalTime: ((Date.now() - t0)/1000).toFixed(1) + 's',
    response: {
      markdownReport: markdown,
      totalTimeSeconds: (Date.now() - t0)/1000,
      finalProbabilities: {
        pNeutral: pNeutral,
        pAware: pAware,
        p0: p0
      }
    }
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
      ...finalEvidence.flatMap(e => e.urls),
      `https://polymarket.com/event/${opts.polymarketSlug}`
    ],
    markdownReport: markdown,
  });
}