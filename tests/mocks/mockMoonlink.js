// tests/mocks/mockMoonlink.js

export function createMockTrack(options = {}) {
  return {
    title: options.title || 'Test Song Title',
    uri: options.uri || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    author: options.author || 'Test Artist',
    duration: options.duration || 210000,
    artworkUrl: options.artworkUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
    requester: options.requester || '111222333444555666',
    position: options.position || 0,
  };
}

export function createMockQueue(tracks = []) {
  const queueTracks = [...tracks];

  return {
    tracks: queueTracks,
    get size() {
      return queueTracks.length;
    },
    get duration() {
      return queueTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    },
    add(trackOrTracks) {
      if (Array.isArray(trackOrTracks)) {
        queueTracks.push(...trackOrTracks);
      } else if (trackOrTracks) {
        queueTracks.push(trackOrTracks);
      }
    },
    remove(index = 0) {
      if (index >= 0 && index < queueTracks.length) {
        return queueTracks.splice(index, 1)[0];
      }
      return null;
    },
    removeRange(start = 0, count = 1) {
      return queueTracks.splice(start, count);
    },
    clear() {
      queueTracks.length = 0;
    },
  };
}

export function createMockPlayer(options = {}) {
  const currentTrack = options.current !== undefined ? options.current : null;
  const queue = options.queue || createMockQueue(options.initialTracks || []);

  const player = {
    guildId: options.guildId || '123456789012345678',
    voiceChannelId: options.voiceChannelId || '987654321098765432',
    textChannelId: options.textChannelId || 'channel_123',
    playing: options.playing !== undefined ? options.playing : false,
    paused: options.paused || false,
    loop: options.loop || false,
    repeat: options.repeat || false,
    current: currentTrack,
    queue: queue,
    lastNowPlayingMessageId: options.lastNowPlayingMessageId || null,

    connect: async () => {
      player.connected = true;
      return player;
    },
    disconnect: async () => {
      player.connected = false;
      player.playing = false;
      return player;
    },
    play: async () => {
      player.playing = true;
      if (!player.current && player.queue.size > 0) {
        player.current = player.queue.remove(0);
      }
      return player;
    },
    pause: async () => {
      player.paused = true;
      return player;
    },
    resume: async () => {
      player.paused = false;
      return player;
    },
    setPaused: async (state = true) => {
      player.paused = state;
      return player;
    },
    skip: async () => {
      if (player.queue.size > 0) {
        player.current = player.queue.remove(0);
      } else {
        player.current = null;
        player.playing = false;
      }
      return player.current;
    },
    stop: async () => {
      player.playing = false;
      player.current = null;
      player.queue.clear();
      return player;
    },
    destroy: async () => {
      player.playing = false;
      player.current = null;
      player.queue.clear();
      player.connected = false;
      return player;
    },
  };

  return player;
}

export function createMockMoonlinkManager(options = {}) {
  const playersMap = new Map();

  if (options.initialPlayer) {
    playersMap.set(options.initialPlayer.guildId, options.initialPlayer);
  }

  const manager = {
    players: {
      get: (guildId) => playersMap.get(guildId) || null,
      create: (opts) => {
        let p = playersMap.get(opts.guildId);
        if (!p) {
          p = createMockPlayer(opts);
          playersMap.set(opts.guildId, p);
        }
        return p;
      },
      destroy: (guildId) => {
        playersMap.delete(guildId);
      },
      cache: playersMap,
    },
    search: async ({ query, requester }) => {
      if (options.searchHandler) {
        return options.searchHandler({ query, requester });
      }

      if (query.includes('playlist')) {
        const tracks = [
          createMockTrack({ title: 'Playlist Track 1', requester }),
          createMockTrack({ title: 'Playlist Track 2', requester }),
          createMockTrack({ title: 'Playlist Track 3', requester }),
        ];
        return {
          loadType: 'playlist',
          playlistInfo: { name: 'Test Playlist' },
          tracks: tracks,
        };
      }

      if (query.includes('empty')) {
        return { loadType: 'empty', tracks: [] };
      }

      if (query.includes('error')) {
        return { loadType: 'error', error: 'Failed to fetch tracks' };
      }

      return {
        loadType: 'track',
        tracks: [createMockTrack({ title: query, requester })],
      };
    },
    init: () => {},
    on: () => {},
  };

  return manager;
}
