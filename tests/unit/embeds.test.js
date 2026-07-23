// tests/unit/embeds.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNowPlayingEmbed,
  buildQueueEmbed,
  buildTrackAddedEmbed,
  buildPlaylistAddedEmbed,
  buildAIDJEmbed,
  buildStatusEmbed,
  buildHistoryEmbed,
} from '../../utils/embeds.js';
import { Colors } from '../../utils/theme.js';
import { createMockPlayer, createMockTrack } from '../mocks/mockMoonlink.js';

describe('Embed Builder Utility Tests', () => {
  describe('buildHistoryEmbed()', () => {
    it('should show empty message when session history has no tracks', () => {
      const player = createMockPlayer();
      player.queueHistory = [];

      const embed = buildHistoryEmbed(player, 1, 5);
      const data = embed.toJSON();

      assert.strictEqual(data.title, '📜 Session Track History');
      assert.ok(data.description.includes('No tracks have been played in this session yet'));
    });

    it('should list played tracks when queueHistory contains tracks', () => {
      const player = createMockPlayer();
      player.queueHistory = [
        { title: 'Track 1', uri: 'https://youtube.com/watch?v=1', duration: 180000, requester: 'user1' },
        { title: 'Track 2', uri: 'https://youtube.com/watch?v=2', duration: 200000, requester: 'user2' },
      ];

      const embed = buildHistoryEmbed(player, 1, 5);
      const data = embed.toJSON();

      assert.strictEqual(data.title, '📜 Session Track History');
      assert.ok(data.fields.some((f) => f.name.includes('Played Recently')));
      assert.ok(data.fields[0].value.includes('Track 1'));
      assert.ok(data.fields[0].value.includes('Track 2'));
    });
  });
  describe('buildNowPlayingEmbed()', () => {
    it('should build Now Playing embed with 3-column fields by default', () => {
      const track = createMockTrack({ title: 'Synthwave Dreams', author: 'Artist A' });
      const player = createMockPlayer({ current: track });

      const embed = buildNowPlayingEmbed(player, track);
      const data = embed.toJSON();

      assert.strictEqual(data.title, 'Now Playing');
      assert.ok(data.description.includes('Synthwave Dreams'));
      assert.strictEqual(data.color, parseInt(Colors.BRAND.replace('#', ''), 16));
      assert.strictEqual(data.fields.length, 3);
      assert.strictEqual(data.fields[0].name, 'Artist / Channel');
      assert.strictEqual(data.fields[0].value, 'Artist A');
      assert.strictEqual(data.fields[1].name, 'Duration');
      assert.strictEqual(data.fields[2].name, 'Requested By');
    });

    it('should change title and color when player is paused', () => {
      const track = createMockTrack();
      const player = createMockPlayer({ current: track, paused: true });

      const embed = buildNowPlayingEmbed(player, track);
      const data = embed.toJSON();

      assert.strictEqual(data.title, 'Playback Paused');
      assert.strictEqual(data.color, parseInt(Colors.WARNING.replace('#', ''), 16));
    });
  });

  describe('buildQueueEmbed()', () => {
    it('should build Queue embed with tracks listed', () => {
      const tracks = [
        createMockTrack({ title: 'Song 1' }),
        createMockTrack({ title: 'Song 2' }),
      ];
      const player = createMockPlayer({ initialTracks: tracks });

      const embed = buildQueueEmbed(player, 1, 5);
      const data = embed.toJSON();

      assert.strictEqual(data.title, 'Current Music Queue');
      assert.ok(data.fields.some((f) => f.name.includes('Up Next')));
    });

    it('should show message when queue is empty', () => {
      const player = createMockPlayer({ initialTracks: [] });

      const embed = buildQueueEmbed(player, 1, 5);
      const data = embed.toJSON();

      assert.ok(data.fields.some((f) => f.value.includes('No tracks in queue')));
    });
  });

  describe('buildTrackAddedEmbed()', () => {
    it('should build Track Added embed for queued song', () => {
      const track = createMockTrack({ title: 'Cool Song' });
      const embed = buildTrackAddedEmbed(track, 2, false, 'user_123');
      const data = embed.toJSON();

      assert.strictEqual(data.title, 'Added to Queue');
      assert.strictEqual(data.color, parseInt(Colors.SUCCESS.replace('#', ''), 16));
      assert.ok(data.fields.some((f) => f.name === 'Position in Queue' && f.value === '#2'));
    });

    it('should build Track Starting embed when playing immediately', () => {
      const track = createMockTrack({ title: 'Cool Song' });
      const embed = buildTrackAddedEmbed(track, 1, true, 'user_123');
      const data = embed.toJSON();

      assert.strictEqual(data.title, 'Track Starting');
      assert.ok(!data.fields.some((f) => f.name === 'Position in Queue'));
    });
  });

  describe('buildPlaylistAddedEmbed()', () => {
    it('should build Playlist Added embed', () => {
      const tracks = [createMockTrack(), createMockTrack()];
      const embed = buildPlaylistAddedEmbed({ name: 'My Chill Mix' }, tracks, 'https://youtube.com/playlist', 'user_123');
      const data = embed.toJSON();

      assert.strictEqual(data.title, 'Playlist Added to Queue');
      assert.ok(data.description.includes('My Chill Mix'));
      assert.ok(data.fields.some((f) => f.name === 'Tracks Added' && f.value === '2'));
    });
  });

  describe('buildAIDJEmbed()', () => {
    it('should build AI DJ playlist embed', () => {
      const tracks = [createMockTrack({ title: 'Vibe 1' }), createMockTrack({ title: 'Vibe 2' })];
      const embed = buildAIDJEmbed('80s synth wave', tracks, 'user_123');
      const data = embed.toJSON();

      assert.strictEqual(data.title, '✨ AI DJ Playlist Added');
      assert.ok(data.description.includes('80s synth wave'));
      assert.strictEqual(data.color, parseInt(Colors.AI_DJ.replace('#', ''), 16));
    });
  });

  describe('buildStatusEmbed()', () => {
    it('should build status embed with specified type colors', () => {
      const infoEmbed = buildStatusEmbed({ title: 'Info', description: 'Test', type: 'info' }).toJSON();
      assert.strictEqual(infoEmbed.color, parseInt(Colors.INFO.replace('#', ''), 16));

      const successEmbed = buildStatusEmbed({ title: 'Success', description: 'Test', type: 'success' }).toJSON();
      assert.strictEqual(successEmbed.color, parseInt(Colors.SUCCESS.replace('#', ''), 16));

      const warningEmbed = buildStatusEmbed({ title: 'Warning', description: 'Test', type: 'warning' }).toJSON();
      assert.strictEqual(warningEmbed.color, parseInt(Colors.WARNING.replace('#', ''), 16));

      const dangerEmbed = buildStatusEmbed({ title: 'Danger', description: 'Test', type: 'danger' }).toJSON();
      assert.strictEqual(dangerEmbed.color, parseInt(Colors.DANGER.replace('#', ''), 16));
    });
  });
});
