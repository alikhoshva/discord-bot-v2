// tests/integration/events.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import interactionCreateEvent from '../../events/interactionCreate.js';
import {
  createMockClient,
  createMockInteraction,
  createMockVoiceChannel,
} from '../mocks/mockDiscord.js';
import { createMockMoonlinkManager, createMockPlayer, createMockTrack } from '../mocks/mockMoonlink.js';

describe('Interaction Event Router Integration Tests', () => {
  it('should route chat input command to registered command handler', async () => {
    let executed = false;
    const client = createMockClient();
    client.commands.set('testcmd', {
      execute: async (interaction) => {
        executed = true;
        await interaction.reply('Executed testcmd');
      },
    });

    const interaction = createMockInteraction({
      type: 'chatInput',
      commandName: 'testcmd',
    });

    await interactionCreateEvent.execute(interaction, client);

    assert.strictEqual(executed, true);
    assert.strictEqual(interaction.replied, true);
  });

  it('should catch and reply ephemeral error if command execution throws', async () => {
    const client = createMockClient();
    client.commands.set('failcmd', {
      execute: async () => {
        throw new Error('Command crash!');
      },
    });

    const interaction = createMockInteraction({
      type: 'chatInput',
      commandName: 'failcmd',
    });

    await interactionCreateEvent.execute(interaction, client);

    assert.strictEqual(interaction.replied, true);
    assert.ok(interaction._replies[0].content.includes('error while executing this command'));
  });

  it('should handle button interaction for player pause/resume', async () => {
    const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
    const player = createMockPlayer({
      guildId: '123456789012345678',
      voiceChannelId: voiceChannel.id,
      paused: false,
      current: createMockTrack(),
    });

    const manager = createMockMoonlinkManager({ initialPlayer: player });
    const client = createMockClient({ manager });

    const interaction = createMockInteraction({
      type: 'button',
      customId: 'music_pause_resume',
      memberOptions: { voiceChannel },
      guild: { id: player.guildId },
    });

    // Simulate editable message attached to button interaction
    interaction.message = { editable: true };

    await interactionCreateEvent.execute(interaction, client);

    assert.strictEqual(player.paused, true);
    assert.strictEqual(interaction._updates.length, 1);
  });

  it('should resume playback when pause/resume button is pressed on paused player', async () => {
    const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
    const player = createMockPlayer({
      guildId: '123456789012345678',
      voiceChannelId: voiceChannel.id,
      paused: true,
      current: createMockTrack(),
    });

    const manager = createMockMoonlinkManager({ initialPlayer: player });
    const client = createMockClient({ manager });

    const interaction = createMockInteraction({
      type: 'button',
      customId: 'music_pause_resume',
      memberOptions: { voiceChannel },
      guild: { id: player.guildId },
    });

    interaction.message = { editable: true };

    await interactionCreateEvent.execute(interaction, client);

    assert.strictEqual(player.paused, false);
    assert.strictEqual(interaction._updates.length, 1);
  });

  it('should reject button interaction if user is in different voice channel', async () => {
    const userVoiceChannel = createMockVoiceChannel({ id: 'user_vc_differing' });
    const player = createMockPlayer({
      guildId: '123456789012345678',
      voiceChannelId: 'bot_vc_999',
    });

    const manager = createMockMoonlinkManager({ initialPlayer: player });
    const client = createMockClient({ manager });

    const interaction = createMockInteraction({
      type: 'button',
      customId: 'music_pause_resume',
      memberOptions: { voiceChannel: userVoiceChannel },
      guild: { id: player.guildId },
    });

    await interactionCreateEvent.execute(interaction, client);

    assert.strictEqual(interaction.replied, true);
    assert.ok(interaction._replies[0].content.includes('same voice channel as the bot'));
  });
});
