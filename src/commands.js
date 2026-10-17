import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const slashCommands = [
  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra qué tema está sonando en DJ Valeria'),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta a la siguiente canción de la lista'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra las próximas canciones que sonarán'),

  new SlashCommandBuilder()
    .setName('tracks')
    .setDescription('Muestra la biblioteca de música actual de DJ Valeria'),

  new SlashCommandBuilder()
    .setName('rescan')
    .setDescription('Recarga la carpeta de canciones sin reiniciar el bot'),

  new SlashCommandBuilder()
    .setName('actualizar')
    .setDescription('Descarga canciones nuevas desde la web de La Guarida y actualiza la radio'),

  new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra los comandos disponibles y la web de DJ Valeria'),

  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Fuerza a DJ Valeria a unirse al canal de voz y empezar a tocar')
];

export async function handleInteraction(interaction, radioPlayer) {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'nowplaying') {
    const track = radioPlayer.getCurrentTrack();
    if (!track) {
      return interaction.reply({ content: '⏸️ No hay ninguna canción reproduciéndose actualmente.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('📻 Sonando ahora en DJ Valeria')
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: 'Categoría', value: track.category.toUpperCase(), inline: true },
        { name: 'Modo', value: '🔀 Loop Infinito 24/7', inline: true }
      )
      .setFooter({ text: 'La Guarida del Noob • Radio 24/7' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'skip') {
    const skipped = radioPlayer.skip();
    return interaction.reply({ content: `⏭️ Saltando: **${skipped?.title || 'canción actual'}**...`, ephemeral: false });
  }

  if (commandName === 'queue') {
    const nextTracks = radioPlayer.getQueuePreview(6);
    if (nextTracks.length === 0) {
      return interaction.reply({ content: 'La cola se está regenerando con nuevas pistas aleatorias...', ephemeral: true });
    }

    const list = nextTracks.map((t, i) => `${i + 1}. **${t.title}** (${t.category})`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📜 Próximas canciones en la cola')
      .setDescription(list)
      .setFooter({ text: 'Orden aleatorio continuo' });

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'tracks') {
    const total = radioPlayer.playlist.length;
    const guaridaCount = radioPlayer.playlist.filter(t => t.category === 'laguarida').length;
    const aoeCount = radioPlayer.playlist.filter(t => t.category === 'aoe').length;

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('🎵 Biblioteca de DJ Valeria')
      .setDescription(`Total de pistas cargadas: **${total}**`)
      .addFields(
        { name: '🔥 La Guarida del Noob', value: `${guaridaCount} temas`, inline: true },
        { name: '⚔️ Age of Empires', value: `${aoeCount} temas`, inline: true }
      )
      .setFooter({ text: 'Puedes agregar más .mp3 a la carpeta tracks/' });

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'rescan' || commandName === 'actualizar') {
    await interaction.deferReply({ ephemeral: false });
    const syncRes = await radioPlayer.syncRemoteTracks();
    radioPlayer.scanTracks();
    radioPlayer.refillQueue();

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('🔄 Sincronización de DJ Valeria')
      .setDescription(`La radio se sincronizó con el servidor y la web oficial.`)
      .addFields(
        { name: 'Nuevas Pistas Descargadas', value: `${syncRes.downloaded}`, inline: true },
        { name: 'Total Biblioteca', value: `${radioPlayer.playlist.length} canciones`, inline: true },
        { name: 'Panel Web Creadores', value: '[laguaridadelnoob.cl/dj](https://laguaridadelnoob.cl/dj)', inline: false }
      )
      .setFooter({ text: 'Tío Alex & La Guarida del Noob' });

    return interaction.editReply({ embeds: [embed] });
  }

  if (commandName === 'ayuda') {
    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('🎧 DJ Valeria 24/7 • Panel de Ayuda')
      .setDescription('Radio oficial continua para La Guarida del Noob & Age of Empires II.')
      .addFields(
        { name: '`/nowplaying`', value: 'Ver la canción actual y su categoría', inline: true },
        { name: '`/queue`', value: 'Ver las próximas canciones en la cola aleatoria', inline: true },
        { name: '`/skip`', value: 'Saltar a la siguiente pista de inmediato', inline: true },
        { name: '`/tracks`', value: 'Ver el conteo total de temas por categoría', inline: true },
        { name: '`/actualizar`', value: 'Sincronizar canciones subidas desde la web', inline: true },
        { name: '`/radio`', value: 'Invocar o mover a DJ Valeria a tu canal de voz', inline: true },
        { name: '🌐 Web Oficial & Estudio de Carga', value: 'Entra a [laguaridadelnoob.cl/dj](https://laguaridadelnoob.cl/dj) para subir canciones nuevas.' }
      )
      .setFooter({ text: 'Canal oficial: 🔊📣│zona-en-vivo🎮🔥' });

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'radio') {
    const memberVoiceChannel = interaction.member?.voice?.channel;
    if (memberVoiceChannel) {
      await radioPlayer.connect(memberVoiceChannel.id, interaction.guildId);
      return interaction.reply({ content: `✅ DJ Valeria se ha conectado a **${memberVoiceChannel.name}** y la radio está sonando.`, ephemeral: false });
    } else {
      await radioPlayer.connect();
      return interaction.reply({ content: '✅ DJ Valeria conectada al canal de voz configurado.', ephemeral: false });
    }
  }
}
