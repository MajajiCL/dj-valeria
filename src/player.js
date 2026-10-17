import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType
} from '@discordjs/voice';
import { ActivityType, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRACKS_DIR = path.resolve(__dirname, '../tracks');

export class RadioPlayer {
  constructor(client, options = {}) {
    this.client = client;
    this.guildId = options.guildId;
    this.channelId = options.channelId;
    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play // Keep playing even if empty
      }
    });

    this.playlist = [];
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.reconnectAttempts = 0;
    this._setupPlayerListeners();

    // Sincronización remota periódica con la web (cada 5 minutos)
    this.syncRemoteTracks().catch(() => {});
    setInterval(() => {
      this.syncRemoteTracks().catch(() => {});
    }, 5 * 60 * 1000);
  }

  // Synchronize remote tracks uploaded via https://laguaridadelnoob.cl/dj
  async syncRemoteTracks() {
    try {
      const manifestUrl = 'https://laguaridadelnoob.cl/dj/upload.php';
      const res = await fetch(manifestUrl, {
        headers: {
          'User-Agent': 'DJValeria/1.0 (+https://laguaridadelnoob.cl/dj)',
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return { downloaded: 0, total: this.playlist.length };
      const data = await res.json();
      if (!data || !Array.isArray(data.tracks)) return { downloaded: 0, total: this.playlist.length };

      let downloaded = 0;
      for (const track of data.tracks) {
        if (!track.filename || !track.url) continue;

        // Sanitización estricta de nombre de archivo (Anti-Path Traversal)
        const safeFilename = path.basename(track.filename).replace(/[^a-zA-Z0-9_\-\.]/g, '');
        if (!safeFilename || safeFilename.includes('..') || !/\.(mp3|wav|flac|ogg|m4a)$/i.test(safeFilename)) {
          console.warn(`[RadioPlayer] ⚠️ Archivo remoto sospechoso o extensión no permitida: ${track.filename}`);
          continue;
        }

        // Validar que la URL provenga estrictamente del dominio oficial
        try {
          const parsedUrl = new URL(track.url);
          if (parsedUrl.hostname !== 'laguaridadelnoob.cl') {
            console.warn(`[RadioPlayer] ⚠️ URL remota no autorizada: ${track.url}`);
            continue;
          }
        } catch {
          continue;
        }

        const category = track.category === 'aoe' ? 'aoe' : 'laguarida';
        const targetCategoryDir = path.join(TRACKS_DIR, category);
        if (!fs.existsSync(targetCategoryDir)) {
          fs.mkdirSync(targetCategoryDir, { recursive: true });
        }

        const targetPath = path.resolve(targetCategoryDir, safeFilename);
        // Garantizar que la ruta de destino resida estrictamente dentro de TRACKS_DIR
        if (!targetPath.startsWith(path.resolve(TRACKS_DIR))) {
          console.warn(`[RadioPlayer] ⚠️ Intento de path traversal bloqueado: ${targetPath}`);
          continue;
        }

        if (!fs.existsSync(targetPath)) {
          console.log(`[RadioPlayer] 📥 Descargando nueva pista verificada: ${track.title} (${safeFilename})...`);
          const fileRes = await fetch(track.url, {
            headers: { 'User-Agent': 'DJValeria/1.0' }
          });
          if (fileRes.ok) {
            const buffer = Buffer.from(await fileRes.arrayBuffer());
            fs.writeFileSync(targetPath, buffer);
            downloaded++;
            console.log(`[RadioPlayer] ✅ Descargada con éxito: ${track.title}`);
          }
        }
      }

      if (downloaded > 0) {
        this.scanTracks();
        this.refillQueue();
        console.log(`[RadioPlayer] 🎉 Biblioteca actualizada: ${downloaded} nuevas canciones añadidas.`);
      }

      return { downloaded, total: this.playlist.length };
    } catch (err) {
      console.warn('[RadioPlayer] Aviso al sincronizar pistas remotas:', err.message);
      return { downloaded: 0, total: this.playlist.length };
    }
  }

  // Scan all supported audio files recursively in tracks/
  scanTracks() {
    const supportedExts = ['.mp3', '.ogg', '.wav', '.flac', '.m4a'];
    const tracks = [];

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExts.includes(ext)) {
            const category = path.basename(dir);
            // Clean title for display
            let title = path.basename(entry.name, ext).replace(/[_\-\(\)]+/g, ' ').trim();
            tracks.push({
              title,
              category,
              fileName: entry.name,
              filePath: fullPath
            });
          }
        }
      }
    };

    scanDir(TRACKS_DIR);
    this.playlist = tracks;
    console.log(`[RadioPlayer] Escaneadas ${this.playlist.length} canciones en la biblioteca.`);
    return this.playlist;
  }

  // Shuffle playlist using Fisher-Yates
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Refill queue when empty and shuffle
  refillQueue() {
    if (this.playlist.length === 0) {
      this.scanTracks();
    }
    this.queue = this.shuffle(this.playlist);
    console.log(`[RadioPlayer] Cola rellenada con ${this.queue.length} pistas en orden aleatorio.`);
  }

  // Play next song in loop
  playNext() {
    if (this.queue.length === 0) {
      this.refillQueue();
    }

    if (this.queue.length === 0) {
      console.warn('[RadioPlayer] No hay canciones en tracks/. Añade archivos .mp3 a tracks/laguarida o tracks/aoe.');
      this.isPlaying = false;
      return;
    }

    const nextTrack = this.queue.shift();
    this.currentTrack = nextTrack;

    try {
      console.log(`[RadioPlayer] 🎶 Reproduciendo: ${nextTrack.title} [${nextTrack.category}]`);
      const resource = createAudioResource(nextTrack.filePath, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(0.85); // 85% comfortable baseline volume
      }

      this.player.play(resource);
      this.isPlaying = true;
      this.updatePresence();
    } catch (err) {
      console.error(`[RadioPlayer] Error al reproducir ${nextTrack.filePath}:`, err);
      // Skip to next immediately on error
      setTimeout(() => this.playNext(), 1000);
    }
  }

  // Skip current track
  skip() {
    console.log('[RadioPlayer] ⏭️ Canción saltada por comando.');
    this.player.stop(); // Triggers AudioPlayerStatus.Idle -> playNext()
    return this.currentTrack;
  }

  // Connect to voice channel and subscribe player
  async connect(channelId = this.channelId, guildId = this.guildId) {
    this.channelId = channelId;
    this.guildId = guildId;

    if (!channelId || !guildId) {
      throw new Error('Falta VOICE_CHANNEL_ID o GUILD_ID en la configuración.');
    }

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error(`No se encontró el servidor con ID: ${guildId}`);
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) {
      throw new Error(`El canal con ID ${channelId} no existe o no es de voz.`);
    }

    console.log(`[RadioPlayer] Conectando al canal de voz: "${channel.name}" en "${guild.name}"...`);

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    this._setupConnectionListeners();
    this.connection.subscribe(this.player);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
      console.log(`[RadioPlayer] ✅ Conexión de voz establecida con éxito en "${channel.name}".`);
      this.reconnectAttempts = 0;

      // Start playing if not already
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('[RadioPlayer] Error al conectar con el canal de voz:', error);
      this.handleDisconnect();
    }
  }

  _setupPlayerListeners() {
    // When song finishes naturally
    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log('[RadioPlayer] Canción finalizada, pasando a la siguiente...');
      this.playNext();
    });

    this.player.on('error', (error) => {
      console.error('[RadioPlayer] Error en el reproductor de audio:', error.message);
      setTimeout(() => this.playNext(), 1500);
    });
  }

  _setupConnectionListeners() {
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.warn('[RadioPlayer] Conexión de voz desconectada. Intentando reconectar...');
      this.handleDisconnect();
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.warn('[RadioPlayer] Conexión destruida. Reiniciando conexión...');
      setTimeout(() => this.connect(), 3000);
    });
  }

  async handleDisconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RadioPlayer] Límite de reconexiones alcanzado. Esperando 30 segundos antes de reintentar...');
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 30_000);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 15_000);
    console.log(`[RadioPlayer] Reintento de conexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${Math.round(delay/1000)}s...`);

    try {
      await Promise.race([
        entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Seems to be reconnecting to a new voice server
    } catch {
      // Cannot reconnect, re-join from scratch
      setTimeout(() => this.connect(), delay);
    }
  }

  // Update Discord activity status and Voice Channel Status
  async updatePresence() {
    if (!this.client.user) return;
    if (this.currentTrack) {
      this.client.user.setPresence({
        activities: [{
          name: `${this.currentTrack.title} 📻`,
          type: ActivityType.Listening
        }],
        status: 'online'
      });

      // Update Voice Channel Status (visible at the top of the voice channel: "Set a channel status")
      if (this.channelId) {
        try {
          const categoryTag = this.currentTrack.category === 'aoe' ? '🗡️ AoE II' : '🔥 Guarida';
          const statusText = `🎶 ${this.currentTrack.title} [${categoryTag}]`;
          await this.client.rest.put(Routes.channelVoiceStatus(this.channelId), {
            body: { status: statusText.slice(0, 100) }
          });
        } catch (err) {
          // Non-critical, ignore if permissions are missing or rate limited
        }
      }
    } else {
      this.client.user.setPresence({
        activities: [{
          name: 'La Guarida del Noob 24/7',
          type: ActivityType.Listening
        }],
        status: 'idle'
      });
      if (this.channelId) {
        try {
          await this.client.rest.put(Routes.channelVoiceStatus(this.channelId), {
            body: { status: '📻 DJ Valeria 24/7 | La Guarida & AoE II' }
          });
        } catch (err) {}
      }
    }
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  getQueuePreview(count = 5) {
    return this.queue.slice(0, count);
  }
}
