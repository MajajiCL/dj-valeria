# 🎧 DJ Valeria — Radio 24/7 para Discord
### La Guarida del Noob & Age of Empires II

DJ Valeria es una variante especializada de **ValerIA** creada para transmitir música de manera **infinita e ininterrumpida (24/7)** en canales de voz de Discord.

---

## 🚀 Características
- **Loop Infinito 24/7:** Reproducción continua sin fin, con re-llenado automático de cola y barajado (Fisher-Yates shuffle).
- **Auto-Reconexión Anti-Caídas:** Si Discord reinicia servidores o hay un corte de red, el bot se reconecta automáticamente al canal de voz con retroceso exponencial.
- **Multicategoría:**
  - `tracks/laguarida`: Temas originales de La Guarida del Noob, Suno, rap de la comunidad, mambos y Tío Alex.
  - `tracks/aoe`: Soundtracks clásicos de Age of Empires II.
- **Rich Presence:** Muestra dinámicamente en el perfil del bot `Escuchando: [Nombre del Tema] 📻`.
- **Slash Commands Integrados:**
  - `/nowplaying`: Muestra qué canción está sonando con embed estilizado.
  - `/skip`: Salta al siguiente tema aleatorio.
  - `/queue`: Muestra las próximas canciones que vienen en la cola.
  - `/tracks`: Muestra las estadísticas de la biblioteca (La Guarida vs AoE).
  - `/rescan`: Recarga nuevas canciones agregadas a la carpeta sin reiniciar el bot.
  - `/radio`: Fuerza al bot a unirse al canal de voz actual.

---

## 📁 Estructura del Proyecto
```
dj-valeria/
├── package.json
├── ecosystem.config.cjs      # Configuración para PM2 (24/7)
├── .env                      # Credenciales privadas
├── .env.example
├── src/
│   ├── index.js              # Inicializador y eventos de Discord
│   ├── player.js             # Reproductor de audio, queue y reconexión
│   └── commands.js           # Slash commands
└── tracks/
    ├── laguarida/            # MP3s de La Guarida (10 temas incluidos)
    └── aoe/                  # Soundtracks de Age of Empires
```

---

## ⚙️ Configuración Paso a Paso

### 1. Crear el Bot en Discord Developer Portal
1. Ve a [Discord Developer Portal](https://discord.com/developers/applications).
2. Haz clic en **New Application** y nómbrala `DJ Valeria`.
3. Sube el avatar oficial de Valeria.
4. Ve a la pestaña **Bot**:
   - Haz clic en **Reset Token** y copia el token en tu `.env` (`DISCORD_TOKEN`).
   - Activa los **Privileged Gateway Intents**:
     - *Server Members Intent* (Opcional)
     - *Message Content Intent* (Opcional)
5. Ve a **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions:
     - `Connect` (Conectar)
     - `Speak` (Hablar)
     - `Send Messages` (Enviar mensajes)
     - `Embed Links` (Insertar enlaces)
     - `Use Slash Commands`
   - Copia la URL generada y abre tu navegador para invitar a DJ Valeria a **La Guarida del Noob**.

### 2. Configurar el `.env`
Copia `.env.example` a `.env`:
```env
DISCORD_TOKEN=tu_token_aqui
DISCORD_CLIENT_ID=tu_application_id_aqui
DISCORD_GUILD_ID=id_del_servidor_de_la_guarida
DISCORD_VOICE_CHANNEL_ID=id_del_canal_de_voz
```

> **Consejo para obtener los IDs:** En Discord, activa el *Modo Desarrollador* en Ajustes > Avanzado. Luego haz clic derecho sobre el servidor o el canal de voz y selecciona **Copiar ID**.

---

## ▶️ Ejecución

### Modo Local (Pruebas)
```bash
npm start
```

### Modo 24/7 en VPS2 (Producción con PM2)
Para que esté encendida para siempre sin requerir tu PC:
```bash
# En el VPS:
pm2 start ecosystem.config.cjs
pm2 save
```
