#!/usr/bin/env tsx
/**
 * Test script to place a voice call via ElevenLabs ConvAI Twilio integration.
 *
 * Usage:
 *   npm run test:voice                # uses env vars
 *   ELEVEN_TO_NUMBER=+1... npm run test:voice
 *   npm run test:voice -- --to=+1... --file=path/to/report.md
 *
 * Safety:
 *   Set ELEVEN_ALLOW_CALL=1 to actually place a call.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { runVoiceAgentCall } from '../src/lib/voice/agent';

type Args = { [k: string]: string | boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      args[k] = v === undefined ? true : v;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const agentId = process.env.ELEVEN_AGENT_ID;
  const agentPhoneNumberId = process.env.ELEVEN_TWILIO_NUM_ID;
  const apiKey = process.env.ELEVEN_API_KEY;
  const allow = process.env.ELEVEN_ALLOW_CALL === '1' || args['force'] === true;

  if (!agentId || !agentPhoneNumberId || !apiKey) {
    console.error('❌ Missing ElevenLabs configuration. Required env vars:');
    console.error('   ELEVEN_AGENT_ID, ELEVEN_TWILIO_NUM_ID, ELEVEN_API_KEY');
    process.exit(1);
  }

  if (!allow) {
    console.error('⚠️  Safety guard: Set ELEVEN_ALLOW_CALL=1 or pass --force to place a real call.');
    process.exit(1);
  }

  const to = (args['to'] as string) || process.env.ELEVEN_TO_NUMBER;
  if (!to) {
    console.error('❌ Missing destination number. Provide --to=+1... or set ELEVEN_TO_NUMBER');
    process.exit(1);
  }

  let reportMarkdown = '# Polyseer Voice Test\n\nThis is a test call from Polyseer.';
  const file = args['file'] as string | undefined;
  if (file) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    reportMarkdown = fs.readFileSync(filePath, 'utf8');
  }

  console.log('📞 Placing call with:');
  console.log(`   to: ${to}`);
  console.log(`   agentId: ${agentId}`);
  console.log(`   agentPhoneNumberId: ${agentPhoneNumberId}`);

  try {
    const res = await runVoiceAgentCall({
      toNumber: to,
      reportMarkdown,
      agentId,
      agentPhoneNumberId,
      apiKey,
    });
    console.log('✅ Call initiated. API response:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('❌ Call failed:');
    console.error(err);
    process.exit(1);
  }
}

main();

