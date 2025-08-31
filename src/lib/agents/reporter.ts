import { generateText } from 'ai';
import { getPolarTrackedModel } from '../polar-llm-strategy';
import { InfluenceItem, ClusterMeta, Evidence } from '../forecasting/types';

// Get model dynamically to use current context
const getModel = () => getPolarTrackedModel('gpt-5');

export async function reporterAgent(
  question: string,
  p0: number,
  pNeutral: number,
  pAware: number | undefined,
  influence: InfluenceItem[],
  clusters: ClusterMeta[],
  drivers: string[],
  evidence: Evidence[], // Add evidence array to access actual claims
  topN = 6
) {
  const top = [...influence].sort((a,b)=>b.deltaPP-a.deltaPP).slice(0, topN);
  
  // Create evidence lookup map for easy access to claims
  const evidenceMap = evidence.reduce((map, ev) => {
    map[ev.id] = ev;
    return map;
  }, {} as Record<string, Evidence>);
  
  // Get the most influential evidence with their claims
  const topEvidenceWithClaims = top.map(t => {
    const ev = evidenceMap[t.evidenceId];
    return {
      id: t.evidenceId,
      claim: ev?.claim || 'Evidence not found',
      polarity: ev?.polarity || 0,
      deltaPP: t.deltaPP,
      type: ev?.type || 'Unknown'
    };
  });

  // Separate pro and con evidence for explanation
  const proEvidence = topEvidenceWithClaims.filter(e => e.polarity > 0);
  const conEvidence = topEvidenceWithClaims.filter(e => e.polarity < 0);
  
  // Determine the prediction direction
  const predictionDirection = pNeutral > 0.5 ? 'YES' : 'NO';
  const confidence = Math.abs(pNeutral - 0.5) * 200; // Convert to 0-100 scale

  const prompt = `
You are the Reporter. Produce a concise Markdown **Forecast Card**.

ANALYSIS RESULTS:
- Primary probability p_neutral = ${(pNeutral*100).toFixed(1)}%
- Secondary market-aware p_aware ${pAware!==undefined?`= ${(pAware*100).toFixed(1)}%`: '(omitted)'}
- Base rate p0 = ${(p0*100).toFixed(1)}%
- Prediction: ${predictionDirection} (${confidence.toFixed(1)}% confidence)
- Key drivers: ${drivers.join('; ') || 'n/a'}

MOST INFLUENTIAL EVIDENCE:
Supporting Evidence (polarity +1):
${proEvidence.map(e => `- ${e.id}: "${e.claim}" (Impact: +${(e.deltaPP*100).toFixed(1)}pp, Type ${e.type})`).join('\n')}

Contradicting Evidence (polarity -1):
${conEvidence.map(e => `- ${e.id}: "${e.claim}" (Impact: +${(e.deltaPP*100).toFixed(1)}pp, Type ${e.type})`).join('\n')}

Question: ${question}

FORMAT REQUIREMENTS:
Write a structured report with these sections:

## Prediction: ${predictionDirection} (${(pNeutral*100).toFixed(1)}%)

## Why This Prediction
Explain the key reasoning based on the most influential evidence found. Reference specific evidence IDs and summarize their claims. Focus on the evidence that most strongly moved the probability.

## Key Drivers
List the main factors that could influence this outcome: ${drivers.slice(0, 3).join(', ')}

## What Would Change Our Mind
List 3-4 specific events or evidence types that would significantly shift the probability in either direction.

## Caveats & Limitations
Note potential biases, data limitations, or factors that reduce confidence.

Keep each section concise (2-4 bullet points). Cite evidence IDs, not raw URLs.
`;
  const { text } = await generateText({ 
    model: getModel(), 
    system: `Write clean, skimmable Markdown only.`, 
    prompt 
  });
  return text;
}
