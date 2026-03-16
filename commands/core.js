// Commande MENU
module.exports = {
    name: 'menu',
    aliases: ['help', 'cmd'],
    async execute(sock, msg, args, { config, stats, reply }) {
        const uptime = formatUptime(process.uptime());
        const user = msg.pushName || 'User';
        
        const menu = `╔══════════════════════╗
║     CHICANO MD      ║
╠══════════════════════╣
║ 👤 User    : ${user}
║ 🤖 Bot     : ${config.botName}
║ 👑 Owner   : ${config.ownerName}
║ 🧬 Version : ${config.version}
║ ⏱ Uptime  : ${uptime}
║ 📊 Msgs    : ${stats.messages}
║ ⚡ Cmds    : ${stats.commands}
╚══════════════════════╝

┏━〔 📦 TÉLÉCHARGEMENT 〕━┓
┃ ◈ .play
┃ ◈ .tt
┃ ◈ .yts
┃ ◈ .ytmp3
┃ ◈ .ytmp4
┗━━━━━━━━━━━━━━━━━┛

┏━〔 🧠 INTELLIGENCE 〕━┓
┃ ◈ .ai
┃ ◈ .gpt
┃ ◈ .image
┗━━━━━━━━━━━━━━━━━┛

┏━〔 👥 GROUPE 〕━┓
┃ ◈ .tagall
┃ ◈ .hidetag
┃ ◈ .kick
┃ ◈ .add
┃ ◈ .promote
┃ ◈ .demote
┃ ◈ .close
┃ ◈ .open
┃ ◈ .link
┃ ◈ .setname
┗━━━━━━━━━━━━━━━━━┛

┏━〔 👑 PROPRIÉTAIRE 〕━┓
┃ ◈ .owner
┃ ◈ .getpp
┗━━━━━━━━━━━━━━━━━┛

┏━〔 ⚡ SYSTÈME 〕━┓
┃ ◈ .ping
┃ ◈ .speed
┃ ◈ .stats
┃ ◈ .repo
┗━━━━━━━━━━━━━━━━━┛

┏━〔 🛠 UTILITAIRES 〕━┓
┃ ◈ .weather
┃ ◈ .translate
┃ ◈ .qr
┃ ◈ .sticker
┗━━━━━━━━━━━━━━━━━┛

╔═════════════════════╗
║ Prefix : ${config.prefix}
║ Status : ONLINE ✅
║ Mode : ${config.pairingMode ? 'CODE' : 'QR'}
╚═════════════════════╝`;

        await reply(menu);
    }
};

// Commande PING
module.exports = {
    name: 'ping',
    async execute(sock, msg, args, { reply }) {
        const start = Date.now();
        await reply('🏓 Pong!');
        const end = Date.now();
        await reply(`⚡ Latence: ${end - start}ms`);
    }
};

// Commande STATS
module.exports = {
    name: 'stats',
    async execute(sock, msg, args, { stats, reply }) {
        const uptime = formatUptime(process.uptime());
        const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        
        const text = `📊 *STATISTIQUES*
        
🤖 Messages: ${stats.messages}
⚡ Commandes: ${stats.commands}
👥 Utilisateurs: ${stats.users.size}
👥 Groupes: ${stats.groups.size}
⏱ Uptime: ${uptime}
💾 RAM: ${memory} MB
🕐 Time: ${new Date().toLocaleTimeString()}`;
        
        await reply(text);
    }
};

// Commande OWNER
module.exports = {
    name: 'owner',
    async execute(sock, msg, args, { config, reply }) {
        await reply(`👑 *Propriétaire*\n\nNom: ${config.ownerName}\nNuméro: ${config.ownerNumber}`);
    }
};

// Commande REPO
module.exports = {
    name: 'repo',
    async execute(sock, msg, args, { reply }) {
        await reply('📂 *CHICANO MD*\n\nGitHub: https://github.com/ELCHICANO/chicano-md');
    }
};

// Formatage uptime
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }
