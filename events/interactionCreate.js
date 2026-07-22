// events/interactionCreate.js
import { Events, MessageFlags } from 'discord.js';
import config from './../config.js';
import { buildQueueEmbed, buildStatusEmbed, buildNowPlayingEmbed } from '../utils/embeds.js';
import { buildPlayerControls, buildQueueControls } from '../utils/components.js';

const autocompleteDebounce = new Map();
const DEBOUNCE_DELAY = 300;
const MIN_QUERY_LENGTH = 3;

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const userId = interaction.user.id;

    // Handle Chat Input Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        const errorOptions = {
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorOptions);
        } else {
          await interaction.reply(errorOptions);
        }
      }
      return;
    }

    // Handle Player Control & Queue Pagination Buttons
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (!customId.startsWith('music_')) return;

      const player = client.manager.players.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({
          content: 'There is nothing playing in this server!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.member.voice.channel?.id !== player.voiceChannelId) {
        return interaction.reply({
          content: 'You need to be in the same voice channel as the bot to use controls!',
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        // Queue Pagination & Refresh Handling
        if (
          customId.startsWith('music_queue_prev_') ||
          customId.startsWith('music_queue_next_') ||
          customId === 'music_queue_refresh'
        ) {
          const itemsPerPage = 5;
          const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
          let targetPage = 1;

          if (customId.startsWith('music_queue_prev_')) {
            const currentPage = parseInt(customId.replace('music_queue_prev_', ''), 10) || 1;
            targetPage = Math.max(1, currentPage - 1);
          } else if (customId.startsWith('music_queue_next_')) {
            const currentPage = parseInt(customId.replace('music_queue_next_', ''), 10) || 1;
            targetPage = Math.min(totalPages, currentPage + 1);
          }

          const embed = buildQueueEmbed(player, targetPage, itemsPerPage);
          const row = buildQueueControls(targetPage, totalPages);
          await interaction.update({ embeds: [embed], components: [row] });
          return;
        }

        switch (customId) {
          case 'music_pause_resume': {
            const isPaused = player.paused;
            if (isPaused) {
              if (typeof player.resume === 'function') await player.resume();
              else await player.pause(false);
            } else {
              await player.pause(true);
            }

            const updatedRow = buildPlayerControls(player);
            const updatedEmbed = player.current ? buildNowPlayingEmbed(player, player.current) : null;

            if (interaction.message?.editable && updatedEmbed) {
              await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
            } else if (interaction.message?.editable) {
              await interaction.update({ components: [updatedRow] });
            } else {
              await interaction.reply({
                content: isPaused ? '▶️ Resumed playback.' : '⏸️ Paused playback.',
                flags: MessageFlags.Ephemeral,
              });
            }
            break;
          }

          case 'music_skip': {
            if (!player.current && player.queue.size === 0) {
              return interaction.reply({
                content: 'No track available to skip!',
                flags: MessageFlags.Ephemeral,
              });
            }
            const skippedTitle = player.current?.title || 'Track';
            await player.skip();

            const embed = buildStatusEmbed({
              title: '⏭️ Skipped Track',
              description: `Skipped: **${skippedTitle}**`,
              type: 'info',
            });
            await interaction.reply({ embeds: [embed] });
            setTimeout(() => {
              interaction.deleteReply().catch(() => {});
            }, 5000);
            break;
          }

          case 'music_stop': {
            player.queue.clear();
            if (typeof player.destroy === 'function') {
              await player.destroy();
            } else {
              await player.stop();
            }

            const embed = buildStatusEmbed({
              title: '⏹️ Playback Stopped',
              description: 'Cleared queue and disconnected from channel.',
              type: 'danger',
            });
            await interaction.reply({ embeds: [embed] });
            setTimeout(() => {
              interaction.deleteReply().catch(() => {});
            }, 5000);
            break;
          }

          case 'music_queue': {
            const itemsPerPage = 5;
            const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
            const embed = buildQueueEmbed(player, 1, itemsPerPage);
            const row = buildQueueControls(1, totalPages);
            await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
            break;
          }

          case 'music_loop': {
            const currentLoop = player.loop || player.repeat || false;
            const newLoopState = !currentLoop;
            player.loop = newLoopState;
            if (typeof player.setLoop === 'function') {
              player.setLoop(newLoopState);
            }

            const updatedRow = buildPlayerControls(player);
            const updatedEmbed = player.current ? buildNowPlayingEmbed(player, player.current) : null;

            if (interaction.message?.editable && updatedEmbed) {
              await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
            } else if (interaction.message?.editable) {
              await interaction.update({ components: [updatedRow] });
            } else {
              await interaction.reply({
                content: newLoopState ? '🔁 Loop mode **enabled**.' : '➡️ Loop mode **disabled**.',
                flags: MessageFlags.Ephemeral,
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error('Error handling button interaction:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while executing player controls.',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      return;
    }

    // Handle Autocomplete
    if (interaction.isAutocomplete()) {
      if (interaction.commandName !== 'play') return;

      try {
        const focusedValue = interaction.options.getFocused();

        if (focusedValue.length < MIN_QUERY_LENGTH) {
          return await interaction.respond([]);
        }

        if (autocompleteDebounce.has(userId)) {
          clearTimeout(autocompleteDebounce.get(userId));
        }

        const newTimer = setTimeout(async () => {
          try {
            if (interaction.responded) return;
            const suggestions = await getYoutubeSuggestions(focusedValue);
            if (!interaction.responded) {
              await interaction.respond(suggestions);
            }
          } catch (apiError) {
            console.error('Error during debounced API call:', apiError.message || apiError);
            if (!interaction.responded) {
              await interaction.respond([]).catch(() => {});
            }
          } finally {
            autocompleteDebounce.delete(userId);
          }
        }, DEBOUNCE_DELAY);

        autocompleteDebounce.set(userId, newTimer);

      } catch (error) {
        console.error('Error in autocomplete handler:', error.message || error);
        if (!interaction.responded) {
          await interaction.respond([]).catch(() => {});
        }
      }
      return;
    }
  },
};

async function getYoutubeSuggestions(query) {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', '10');
    url.searchParams.append('key', config.YOUTUBE_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      console.error(`YouTube API returned status ${res.status}: ${errText}`);
      return [];
    }

    const data = await res.json();
    if (!data?.items) {
      return [];
    }

    return data.items.map((item) => {
      const title = item.snippet.title;
      const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;

      return {
        name: title.length > 100 ? title.substring(0, 97) + '...' : title,
        value: videoUrl,
      };
    });
  } catch (error) {
    console.error('Error fetching YouTube suggestions:', error.message);
    return [];
  }
}
