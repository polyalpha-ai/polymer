import axios from "axios";

export interface OutboundCallOptions {
  toNumber?: string; // optional; defaults to ELEVEN_TO_NUMBER
  reportMarkdown?: string; // optional; falls back to mock report
  marketShortName?: string;
  keyOdds?: string;
  catalyst?: string;
  agentId?: string;
  agentPhoneNumberId?: string;
  apiKey?: string;
}

export function generateMockReport(input?: { marketShortName?: string; keyOdds?: string; catalyst?: string; }): string {
  const now = new Date();
  const ts = now.toLocaleString(undefined, { hour12: false });
  const name = input?.marketShortName ?? 'Talyor swifts wedding';
  const odds = Number(input?.keyOdds ?? '60');
  const catalyst = input?.catalyst ?? 'recent developments and news flow';

  const headlineProb = Math.max(1, Math.min(99, Math.round(odds)));
  const priorProb = Math.max(1, Math.min(99, Math.round(Math.max(5, Math.min(95, headlineProb - 5)))));

  return [
    `# Forecast Update: ${name}`,
    ``,
    `As of ${ts}, our best estimate places the probability at ~${headlineProb}% (from ~${priorProb}% baseline).`,
    ``,
    `## Why it moved`,
    `- Fresh signals suggest momentum in favor of the outcome.`,
    `- ${catalyst} improved the expected path-to-resolution.`,
    `- No material contradictory evidence appeared in the last 24 hours.`,
    ``,
    `## What to watch next (1–2 weeks)`,
    `- Official statements or filings that could confirm the current trajectory.`,
    `- Market liquidity/price drift as participants incorporate new information.`,
    `- Any credible counter-signal that reduces confidence in the above catalysts.`,
    ``,
    `## Risks`,
    `- Over-reliance on single-source reports; surprise reversals are possible.`,
    `- Timing uncertainty could stall the move even if the thesis remains intact.`,
    ``,
    `## Bottom line`,
    `The balance of evidence currently supports the outcome at ~${headlineProb}% with upside/downside skew determined by upcoming catalysts. We will revise promptly as new, independently verified information arrives.`,
  ].join('\n');
}

function deriveMarketNameFromReport(text?: string): string | undefined {
  if (!text) return undefined;
  // Try first markdown heading
  const m = text.match(/^#\s+(.+)$/m);
  if (m && m[1]) return m[1].trim().slice(0, 80);
  return undefined;
}

function deriveOddsFromReport(text?: string): string | undefined {
  if (!text) return undefined;
  const m = text.match(/(\d{1,2})\s*%/);
  if (m && m[1]) return m[1];
  return undefined;
}

export async function runVoiceAgentCall(opts: OutboundCallOptions) {
  const agent_id = opts.agentId || process.env.ELEVEN_AGENT_ID;
  const agent_phone_number_id =
    opts.agentPhoneNumberId || process.env.ELEVEN_TWILIO_NUM_ID;
  const apiKey = opts.apiKey || process.env.ELEVEN_API_KEY;
  const toNumber = opts.toNumber || process.env.ELEVEN_TO_NUMBER;

  if (!agent_id) throw new Error("Missing ELEVEN_AGENT_ID");
  if (!agent_phone_number_id) throw new Error("Missing ELEVEN_TWILIO_NUM_ID");
  if (!apiKey) throw new Error("Missing ELEVEN_API_KEY");
  if (!toNumber) throw new Error("Missing toNumber (provide opts.toNumber or ELEVEN_TO_NUMBER env var)");

  const hasAnyDynamicExtras = Boolean(opts.marketShortName || opts.keyOdds || opts.catalyst);
  const userReport = (opts.reportMarkdown && String(opts.reportMarkdown).trim().length > 0) ? opts.reportMarkdown! : undefined;
  const derivedName = opts.marketShortName || deriveMarketNameFromReport(userReport);
  const derivedOdds = opts.keyOdds || deriveOddsFromReport(userReport);
  const derivedCatalyst = opts.catalyst || 'recent developments and news flow';

  const reportMarkdown = userReport ?? generateMockReport({
    marketShortName: derivedName,
    keyOdds: derivedOdds,
    catalyst: derivedCatalyst,
  });

  const payload = {
    agent_id,
    agent_phone_number_id,
    to_number: toNumber,
    conversation_initiation_client_data: {
      dynamic_variables: (() => {
        // Always include required variables; derive sensible defaults if missing
        const dyn: Record<string, string> = {
          report_md: reportMarkdown,
          market_short_name: derivedName || 'Key Outcome',
          key_odds: (derivedOdds || '60'),
          catalyst: derivedCatalyst,
        };
        return dyn;
      })(),
    },
  };

  // Add before your API call in agent.ts
  console.log('🔍 Debug info:');
  console.log('Agent ID:', agent_id);
  console.log('Phone Number ID:', agent_phone_number_id);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
  console.log('Dynamic variables:', payload.conversation_initiation_client_data.dynamic_variables);

  // Also try a simple API test first
  try {
    const testResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
      headers: { "xi-api-key": apiKey }
    });
    console.log('✅ API key is valid');
  } catch (err) {
    console.log('❌ API key validation failed');
  }

  const res = await axios.post(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    payload,
    { headers: { "xi-api-key": apiKey } }
  );

  return res.data;
}

export default runVoiceAgentCall;
