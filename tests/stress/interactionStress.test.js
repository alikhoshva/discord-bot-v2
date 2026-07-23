// tests/stress/interactionStress.test.js
import assert from 'node:assert/strict';
import interactionCreateEvent from '../../events/interactionCreate.js';
import {
  createMockClient,
  createMockInteraction,
  createMockVoiceChannel,
} from '../mocks/mockDiscord.js';
import { createMockMoonlinkManager, createMockPlayer, createMockTrack } from '../mocks/mockMoonlink.js';

async function runStressTest() {
  console.log('🚀 Starting Bot High-Concurrency Stress Test...\n');

  // Setup client & command mocks
  const client = createMockClient();
  const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
  const player = createMockPlayer({
    guildId: '123456789012345678',
    voiceChannelId: voiceChannel.id,
    current: createMockTrack(),
  });

  const manager = createMockMoonlinkManager({ initialPlayer: player });
  client.manager = manager;

  // Register benchmark slash command
  client.commands.set('ping', {
    execute: async (interaction) => {
      interaction.deferred = true;
      await interaction.reply('Pong!');
    },
  });

  const TOTAL_INTERACTIONS = 2000;
  const CONCURRENCY_BATCH = 100;

  // Force garbage collection hint if available
  if (global.gc) global.gc();

  const memBefore = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  let processedCount = 0;

  for (let i = 0; i < TOTAL_INTERACTIONS; i += CONCURRENCY_BATCH) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY_BATCH; j++) {
      const isButton = (i + j) % 2 === 0;
      const interaction = createMockInteraction({
        type: isButton ? 'button' : 'chatInput',
        commandName: 'ping',
        customId: isButton ? 'music_pause_resume' : null,
        memberOptions: { voiceChannel },
        guild: { id: player.guildId },
      });
      if (isButton) interaction.message = { editable: true };

      batch.push(interactionCreateEvent.execute(interaction, client));
    }
    await Promise.all(batch);
    processedCount += batch.length;
  }

  const endTime = performance.now();
  if (global.gc) global.gc();
  const memAfter = process.memoryUsage().heapUsed;

  const durationMs = endTime - startTime;
  const opsPerSec = Math.round((processedCount / durationMs) * 1000);
  const avgLatencyMs = (durationMs / processedCount).toFixed(3);
  const heapDeltaMB = ((memAfter - memBefore) / 1024 / 1024).toFixed(2);

  console.log('====================================================');
  console.log('📊 BOT STRESS TEST RESULTS');
  console.log('====================================================');
  console.log(`Total Simulated Interactions : ${processedCount.toLocaleString()}`);
  console.log(`Duration Elapsed            : ${durationMs.toFixed(2)} ms`);
  console.log(`Throughput                  : ${opsPerSec.toLocaleString()} ops/sec`);
  console.log(`Average Latency             : ${avgLatencyMs} ms / op`);
  console.log(`Heap Memory Delta           : ${heapDeltaMB} MB`);
  console.log('====================================================\n');

  assert.strictEqual(processedCount, TOTAL_INTERACTIONS);
  assert.ok(durationMs > 0);
  console.log('✅ Stress Test Passed Successfully!');
}

runStressTest().catch((err) => {
  console.error('❌ Stress Test Failed:', err);
  process.exit(1);
});
