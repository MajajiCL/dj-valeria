import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { RadioPlayer } from './player.js';
import { slashCommands, handleInteraction } from './commands.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const VOICE_CHANNEL_ID = process.env.DISCORD_VOICE_CHANNEL_ID;

if (!TOKEN) {
  console.error('❌ ERROR: Falta DISCORD_TOKEN en el archivo .env');
  console.log('👉 Por favor copia .env.example a .env y completa las credenciales.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

const radio = new RadioPlayer(client, {
  guildId: GUILD_ID,
  channelId: VOICE_CHANNEL_ID
});

// Register slash commands with Discord API
async function registerCommands() {
  if (!CLIENT_ID) {
    console.warn('⚠️ AVISO: DISCORD_CLIENT_ID no configurado en .env. Se omitirá registro de slash commands.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('[DJ Valeria] Registrando comandos de barra (/)...');
    if (GUILD_ID) {
      // Guild commands update immediately
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: slashCommands }
      );
      console.log(`[DJ Valeria] ✅ Comandos registrados exitosamente en servidor ${GUILD_ID}.`);
    } else {
      // Global commands take up to 1 hour
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: slashCommands }
      );
      console.log('[DJ Valeria] ✅ Comandos globales registrados exitosamente.');
    }
  } catch (err) {
    console.error('[DJ Valeria] Error al registrar comandos:', err);
  }
}

client.once('ready', async () => {
  console.log(`===============================================`);
  console.log(`🎧 DJ Valeria está ONLINE como: ${client.user.tag}`);
  console.log(`===============================================`);

  // Scan music
  radio.scanTracks();

  // Register commands
  await registerCommands();

  // Auto-connect to voice channel if configured
  if (VOICE_CHANNEL_ID && GUILD_ID) {
    try {
      await radio.connect();
    } catch (err) {
      console.error('[DJ Valeria] Error al autoconectar al canal de voz:', err.message);
      console.log('👉 Puedes usar /radio en un canal de texto cuando estés listo.');
    }
  } else {
    console.log('ℹ️ No se especificó DISCORD_VOICE_CHANNEL_ID. Usa el comando /radio desde un canal de voz.');
  }
});

// Handle Slash Commands
client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction, radio);
  } catch (err) {
    console.error('[DJ Valeria] Error ejecutando comando:', err);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({ content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true });
    }
  }
});

// Global resilience handlers - NEVER CRASH
process.on('unhandledRejection', (reason, promise) => {
  console.error('[DJ Valeria] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[DJ Valeria] Uncaught Exception:', err);
});

client.login(TOKEN);
