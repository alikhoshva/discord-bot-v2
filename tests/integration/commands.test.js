// tests/integration/commands.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import pingCommand from '../../commands/utility/ping.js';
import playCommand from '../../commands/music/play.js';
import skipCommand from '../../commands/music/skip.js';
import stopCommand from '../../commands/music/stop.js';
import queueCommand from '../../commands/music/queue.js';
import nowplayingCommand from '../../commands/music/nowplaying.js';

import {
  createMockClient,
  createMockInteraction,
  createMockVoiceChannel,
} from '../mocks/mockDiscord.js';
import { createMockMoonlinkManager, createMockPlayer, createMockTrack } from '../mocks/mockMoonlink.js';

describe('Slash Command Integration Tests', () => {
  describe('/ping', () => {
    it('should reply with latency and websocket ping embed', async () => {
      const interaction = createMockInteraction({ commandName: 'ping' });
      interaction.createdTimestamp = 1000;

      const client = createMockClient();
      client.ws = { ping: 42 };

      // Simulate deferReply returning a sent object with createdTimestamp
      interaction.deferReply = async () => {
        interaction.deferred = true;
        return { createdTimestamp: 1050 };
      };

      await pingCommand.execute(interaction, client);

      assert.strictEqual(interaction.deferred, true);
      assert.strictEqual(interaction._replies.length, 1);
      const reply = interaction._replies[0];
      assert.ok(reply.embeds && reply.embeds.length === 1);
      const embedData = reply.embeds[0].toJSON();
      assert.strictEqual(embedData.title, 'Pong!');
    });
  });

  describe('/play', () => {
    it('should search and play single track when bot is not playing', async () => {
      const voiceChannel = createMockVoiceChannel();
      const interaction = createMockInteraction({
        commandName: 'play',
        optionsData: { song: 'Synthwave' },
        memberOptions: { voiceChannel },
      });

      const manager = createMockMoonlinkManager();
      const client = createMockClient({ manager });

      await playCommand.execute(interaction, client);

      assert.strictEqual(interaction.deferred, true);
      const player = client.manager.players.get(interaction.guild.id);
      assert.ok(player);
      assert.strictEqual(player.playing, true);
      assert.strictEqual(player.current.title, 'Synthwave');
    });

    it('should load playlist when playlist query is provided', async () => {
      const voiceChannel = createMockVoiceChannel();
      const interaction = createMockInteraction({
        commandName: 'play',
        optionsData: { song: 'https://youtube.com/playlist?list=123' },
        memberOptions: { voiceChannel },
      });

      const manager = createMockMoonlinkManager();
      const client = createMockClient({ manager });

      await playCommand.execute(interaction, client);

      assert.strictEqual(interaction.deferred, true);
      const player = client.manager.players.get(interaction.guild.id);
      assert.ok(player);
      assert.strictEqual(player.playing, true);
      assert.strictEqual(player.queue.size, 2);
    });

    it('should editReply with error when no results found', async () => {
      const voiceChannel = createMockVoiceChannel();
      const interaction = createMockInteraction({
        commandName: 'play',
        optionsData: { song: 'empty_query' },
        memberOptions: { voiceChannel },
      });

      const manager = createMockMoonlinkManager();
      const client = createMockClient({ manager });

      await playCommand.execute(interaction, client);

      assert.strictEqual(interaction.deferred, true);
      assert.ok(interaction._replies.some((r) => typeof r === 'string' && r.includes('No results found')));
    });
  });

  describe('/skip', () => {
    it('should skip current track when multiple tracks exist', async () => {
      const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
      const interaction = createMockInteraction({
        commandName: 'skip',
        optionsData: { number: 1 },
        memberOptions: { voiceChannel },
      });

      const tracks = [createMockTrack({ title: 'Song 2' })];
      const player = createMockPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id,
        current: createMockTrack({ title: 'Song 1' }),
        initialTracks: tracks,
      });

      const manager = createMockMoonlinkManager({ initialPlayer: player });
      const client = createMockClient({ manager });

      await skipCommand.execute(interaction, client);

      assert.strictEqual(player.current.title, 'Song 2');
    });
  });

  describe('/stop', () => {
    it('should stop playback, clear queue, and destroy player', async () => {
      const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
      const interaction = createMockInteraction({
        commandName: 'stop',
        memberOptions: { voiceChannel },
      });

      const player = createMockPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id,
        current: createMockTrack(),
        initialTracks: [createMockTrack()],
      });

      const manager = createMockMoonlinkManager({ initialPlayer: player });
      const client = createMockClient({ manager });

      await stopCommand.execute(interaction, client);

      assert.strictEqual(player.playing, false);
      assert.strictEqual(player.queue.size, 0);
    });
  });

  describe('/queue', () => {
    it('should display queue embed and controls', async () => {
      const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
      const interaction = createMockInteraction({
        commandName: 'queue',
        memberOptions: { voiceChannel },
      });

      const player = createMockPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id,
        current: createMockTrack(),
        initialTracks: [createMockTrack({ title: 'Next Song' })],
      });

      const manager = createMockMoonlinkManager({ initialPlayer: player });
      const client = createMockClient({ manager });

      await queueCommand.execute(interaction, client);

      assert.strictEqual(interaction.replied, true);
      const reply = interaction._replies[0];
      assert.ok(reply.embeds && reply.embeds.length === 1);
      assert.ok(reply.components && reply.components.length === 1);
    });
  });

  describe('/nowplaying', () => {
    it('should return ephemeral error if nothing playing', async () => {
      const interaction = createMockInteraction({ commandName: 'nowplaying' });
      const manager = createMockMoonlinkManager();
      const client = createMockClient({ manager });

      await nowplayingCommand.execute(interaction, client);

      assert.strictEqual(interaction.replied, true);
      assert.ok(interaction._replies[0].content.includes('nothing currently playing'));
    });

    it('should render now playing card when song is playing', async () => {
      const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
      const interaction = createMockInteraction({
        commandName: 'nowplaying',
        memberOptions: { voiceChannel },
      });

      const player = createMockPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id,
        current: createMockTrack({ title: 'Active Track' }),
      });

      const manager = createMockMoonlinkManager({ initialPlayer: player });
      const client = createMockClient({ manager });

      await nowplayingCommand.execute(interaction, client);

      assert.strictEqual(interaction.replied, true);
      const reply = interaction._replies[0];
      assert.ok(reply.embeds && reply.embeds.length === 1);
      assert.ok(reply.components && reply.components.length === 2);
    });
  });

  describe('/history', () => {
    it('should display history embed for session tracks', async () => {
      const historyCommand = (await import('../../commands/music/history.js')).default;
      const voiceChannel = createMockVoiceChannel({ id: 'vc_shared' });
      const interaction = createMockInteraction({
        commandName: 'history',
        memberOptions: { voiceChannel },
      });

      const player = createMockPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id,
      });
      player.queueHistory = [
        { title: 'Played Track 1', uri: 'https://youtube.com/watch?v=1', duration: 180000, requester: 'user1' }
      ];

      const manager = createMockMoonlinkManager({ initialPlayer: player });
      const client = createMockClient({ manager });

      await historyCommand.execute(interaction, client);

      assert.strictEqual(interaction.replied, true);
      const reply = interaction._replies[0];
      assert.ok(reply.embeds && reply.embeds.length === 1);
      assert.strictEqual(reply.embeds[0].data.title, '📜 Session Track History');
    });
  });
});
