import { getAiConfig, isAiEnabled } from '../apps/server/src/config/aiConfig';
import { geminiClient } from '../apps/server/src/services/ai/geminiClient';
import { coraService } from '../apps/server/src/services/ai/coraService';

async function main() {
  console.log('================================================================================');
  console.log('MEDCORE LIVE AI VERIFIER (Google AI Studio Gemini 3.5 Flash Lite with 3.1 Flash Lite Failover)');
  console.log('================================================================================\n');

  const config = getAiConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey || apiKey.length < 5) {
    console.warn('⚠️  No GEMINI_API_KEY detected in .env!');
    console.log('\nTo test with real Gemini models:');
    console.log('1. Open .env in your editor');
    console.log('2. Set: GEMINI_API_KEY=your_actual_gemini_api_key_here');
    console.log('3. Run: npm run test:ai:live\n');
    console.log('Currently falling back to deterministic offline mock.');
  } else {
    console.log(`✅ GEMINI_API_KEY detected: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
    console.log(`Target Model: ${config.geminiModel}`);
    console.log(`AI Enabled: ${isAiEnabled()}`);
  }

  console.log('\n--- Test 1: Direct Gemini API Call ---');
  const directResponse = await geminiClient.generate({
    model: config.geminiModel,
    prompt: 'You are Cora, the Philippine hospital billing advocate for MedCore. Briefly greet the patient in Taglish and explain that your goal is zero out-of-pocket surprise fees.',
    systemInstruction: 'Respond warmly in Taglish. Keep response under 3 sentences.'
  });

  console.log(`Model Used:     ${directResponse.modelUsed}`);
  console.log(`Latency:        ${directResponse.latencyMs}ms`);
  console.log(`Prompt Tokens:  ${directResponse.tokensPrompt}`);
  console.log(`Output Tokens:  ${directResponse.tokensCompletion}`);
  console.log(`Is Mock Fallback: ${directResponse.isMock}`);
  console.log('\nResponse Output:');
  console.log('--------------------------------------------------');
  console.log(directResponse.text);
  console.log('--------------------------------------------------\n');

  console.log('--- Test 2: Cora Patient Concierge Service (with PHI Sanitization) ---');
  const coraChat = await coraService.chat({
    message: 'Bakit may natitira pa akong babayaran na ₱20,200 kung may PhilHealth naman ako?',
    language: 'fil',
    mode: 'WHY_DO_I_OWE'
  });

  console.log('Cora Reply:');
  console.log('--------------------------------------------------');
  console.log(coraChat.reply);
  console.log('--------------------------------------------------');
  console.log('Suggested Actions:', coraChat.suggestedActions.map(a => a.label).join(' | '));
  console.log(`Grounded Net Due: ₱${coraChat.groundedBalance.netPatientDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  console.log(`Grounded Remaining: ₱${coraChat.groundedBalance.remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  console.log('\n================================================================================');
  console.log('TEST COMPLETE');
  console.log('================================================================================');
}

main().catch(console.error);
