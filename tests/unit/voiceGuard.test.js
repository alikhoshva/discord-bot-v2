// tests/unit/voiceGuard.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import {
  createMockClient,
  createMockInteraction,
  createMockVoiceChannel,
} from '../mocks/mockDiscord.js';
import { createMockMoonlinkManager, createMockPlayer, createMockTrack } from '../mocks/mockMoonlink.js';

describe('Voice Permission Guard Tests', () => {
  it('should return null and reply if user is not in a voice channel', async () => {
    const interaction = createMockInteraction({ memberOptions: { inVoice: false } });
    const client = createMockClient();

    const result = await validateVoicePermissions(interaction, client);

    assert.strictEqual(result, null);
    assert.strictEqual(interaction.replied, true);
    assert.ok(interaction._replies[0].content.includes('join a voice channel first'));
  });

  it('should return channel and null player when player is not required and does not exist', async () => {
    const voiceChannel = createMockVoiceChannel({ id: 'vc_111' });
    const interaction = createMockInteraction({ memberOptions: { voiceChannel } });
    const manager = createMockMoonlinkManager();
    const client = createMockClient({ manager });

    const result = await validateVoicePermissions(interaction, client, { requirePlayer: false });

    assert.ok(result);
    assert.strictEqual(result.channel.id, 'vc_111');
    assert.strictEqual(result.player, null);
  });

  it('should return null if player is required but no player exists', async () => {
    const voiceChannel = createMockVoiceChannel();
    const interaction = createMockInteraction({ memberOptions: { voiceChannel } });
    const manager = createMockMoonlinkManager();
    const client = createMockClient({ manager });

    const result = await validateVoicePermissions(interaction, client, { requirePlayer: true });

    assert.strictEqual(result, null);
    assert.strictEqual(interaction.replied, true);
    assert.ok(interaction._replies[0].content.includes('nothing playing'));
  });

  it('should return null if user is in a different voice channel than the bot', async () => {
    const userVoiceChannel = createMockVoiceChannel({ id: 'user_vc_123' });
    const interaction = createMockInteraction({ memberOptions: { voiceChannel: userVoiceChannel } });
    const player = createMockPlayer({ guildId: interaction.guild.id, voiceChannelId: 'bot_vc_999' });
    const manager = createMockMoonlinkManager({ initialPlayer: player });
    const client = createMockClient({ manager });

    const result = await validateVoicePermissions(interaction, client);

    assert.strictEqual(result, null);
    assert.strictEqual(interaction.replied, true);
    assert.ok(interaction._replies[0].content.includes('same voice channel as the bot'));
  });

  it('should return valid state when user and bot are in the same voice channel', async () => {
    const channel = createMockVoiceChannel({ id: 'shared_vc_123' });
    const interaction = createMockInteraction({ memberOptions: { voiceChannel: channel } });
    const player = createMockPlayer({ guildId: interaction.guild.id, voiceChannelId: channel.id, current: createMockTrack() });
    const manager = createMockMoonlinkManager({ initialPlayer: player });
    const client = createMockClient({ manager });

    const result = await validateVoicePermissions(interaction, client, { requirePlayer: true, requirePlaying: true });

    assert.ok(result);
    assert.strictEqual(result.channel.id, 'shared_vc_123');
    assert.strictEqual(result.player.guildId, player.guildId);
  });
});
