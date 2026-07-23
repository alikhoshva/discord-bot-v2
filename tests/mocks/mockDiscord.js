// tests/mocks/mockDiscord.js

export function createMockGuild(options = {}) {
  return {
    id: options.id || '123456789012345678',
    name: options.name || 'Test Guild',
    members: {
      fetch: async (id) => ({ id, guild: { id: options.id || '123456789012345678' } }),
    },
    channels: {
      fetch: async (id) => ({ id, isTextBased: () => true }),
    },
  };
}

export function createMockVoiceChannel(options = {}) {
  return {
    id: options.id || '987654321098765432',
    name: options.name || 'Test Voice Channel',
    guild: createMockGuild(),
  };
}

export function createMockMember(options = {}) {
  const voiceChannel = options.inVoice === false ? null : createMockVoiceChannel(options.voiceChannel);
  return {
    id: options.id || '111222333444555666',
    user: {
      id: options.id || '111222333444555666',
      tag: options.tag || 'TestUser#0001',
      username: options.username || 'TestUser',
    },
    voice: {
      channel: voiceChannel,
      channelId: voiceChannel?.id || null,
    },
  };
}

export function createMockInteraction(options = {}) {
  const replies = [];
  const followUps = [];
  const updates = [];

  const interaction = {
    id: options.id || 'interaction_123',
    commandName: options.commandName || 'test',
    customId: options.customId || null,
    guild: options.guild || createMockGuild(),
    guildId: options.guildId || '123456789012345678',
    member: options.member || createMockMember(options.memberOptions),
    user: options.user || (options.member ? options.member.user : createMockMember().user),
    channel: options.channel || {
      id: 'channel_123',
      send: async (payload) => ({ id: 'msg_999', ...payload }),
    },
    replied: false,
    deferred: false,
    options: {
      getString: (name) => options.optionsData?.[name] ?? null,
      getInteger: (name) => options.optionsData?.[name] ?? null,
      getBoolean: (name) => options.optionsData?.[name] ?? null,
      getMember: (name) => options.optionsData?.[name] ?? null,
      getUser: (name) => options.optionsData?.[name] ?? null,
      getChannel: (name) => options.optionsData?.[name] ?? null,
      getFocused: () => options.focusedValue ?? '',
    },
    isChatInputCommand: () => options.type === 'chatInput' || !options.type,
    isButton: () => options.type === 'button',
    isAutocomplete: () => options.type === 'autocomplete',
    reply: async (payload) => {
      interaction.replied = true;
      replies.push(payload);
      return payload;
    },
    deferReply: async (payload) => {
      interaction.deferred = true;
      return payload;
    },
    editReply: async (payload) => {
      replies.push(payload);
      return payload;
    },
    followUp: async (payload) => {
      followUps.push(payload);
      return payload;
    },
    update: async (payload) => {
      updates.push(payload);
      return payload;
    },
    respond: async (choices) => {
      interaction.respondedChoices = choices;
      return choices;
    },
    deleteReply: async () => {
      interaction.deleted = true;
    },
    _replies: replies,
    _followUps: followUps,
    _updates: updates,
  };

  return interaction;
}

export function createMockClient(options = {}) {
  return {
    user: {
      id: 'bot_123456789',
      tag: 'TestBot#0000',
    },
    manager: options.manager || null,
    commands: new Map(),
    guilds: {
      cache: new Map(),
    },
  };
}
