import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { InfluenceItem, ClusterMeta } from '../forecasting/types';

const model = openai('gpt-5');

export async function reporterAgent(
  question: string,
  p0: number,
  pNeutral: number,
  pAware: number | undefined,
  influence: InfluenceItem[],
  clusters: ClusterMeta[],
  drivers: string[],
  topN = 6
) {
  const top = [...influence].sort((a,b)=>b.deltaPP-a.deltaPP).slice(0, topN);
  const prompt = `
You are the Reporter. Produce a concise Markdown **Forecast Card**.

Fields:
- Primary probability p_neutral = ${(pNeutral*100).toFixed(1)}%
- Secondary market-aware p_aware ${pAware!==undefined?`= ${(pAware*100).toFixed(1)}%`: '(omitted)'}
- Base rate p0 = ${(p0*100).toFixed(1)}%
- Key drivers: ${drivers.join('; ') || 'n/a'}
- Top influence items: ${top.map(t=>`${t.evidenceId} (Δpp=${(t.deltaPP*100).toFixed(1)})`).join(', ')}

Question: ${question}
Write 6-10 bullet points: key drivers, what would change our mind (EV triggers), and caveats. Keep it tight and cite evidence ids, not raw URLs.
`;
  const { text } = await generateText({ 
    model, 
    system: `Write clean, skimmable Markdown only.`, 
    prompt 
  });
  return text;
}
