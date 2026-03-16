/**
 * CHICANO MD - WhatsApp Bot pour Katabump
 * Version 3.0.0
 */

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const chalk = require('chalk');
const moment = require('moment-timezone');

// Configuration
const config = require('./config');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Variables globales
let sock = null;
let pairingCode = null;
let startTime = Date.now();
let stats = {
    messages: 0,
    commands: 0,
    users: new Set(),
    groups: new Set(),
    uptime: 0
};

// Charger les commandes
const commands = new Map();
const aliases = new Map();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
        const command = require(path.join(commandsPath, file));
        if (command.name && command.execute) {
            commands.set(command.name, command);
            if (command.aliases) {
                command.aliases.forEach(alias => aliases.set(alias, command.name));
            }
        }
    }
    console.log(chalk.green(`✅ ${commands.size} commandes chargées`));
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        status: sock ? 'connected' : 'disconnected',
        botName: config.botName,
        version: config.version,
        owner: config.ownerName,
        uptime: process.uptime(),
        messages: stats.messages,
        commands: stats.commands,
        users: stats.users.size,
        groups: stats.groups.size,
        memory: process.memoryUsage().rss / 1024 / 1024
    });
});

app.post('/api/pair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Numéro requis' });
        }

        if (!sock) {
            return res.status(500).json({ error: 'Bot pas initialisé' });
        }

        const code = await sock.requestPairingCode(phoneNumber);
        const formattedCode = code.match(/.{1,4}/g).join('-');
        
        pairingCode = formattedCode;
        io.emit('pairing-code', { code: formattedCode });
        
        res.json({ success: true, pairingCode: formattedCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fonction pour démarrer le bot
async function startBot() {
    try {
        console.log(chalk.blue('🚀 Démarrage de CHICANO MD...'));
        
        const { state, saveCreds } = await useMultiFileAuthState('session');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['CHICANO MD', 'Safari', config.version],
            syncFullHistory: true,
            markOnlineOnConnect: true
        });

        // Sauvegarde des credentials
        sock.ev.on('creds.update', saveCreds);

        // Gestion connexion
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log(chalk.yellow('📱 QR Code généré (disponible sur le web)'));
                io.emit('qr', { qr });
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(chalk.red(`❌ Connexion fermée, reconnexion: ${shouldReconnect}`));
                
                if (shouldReconnect) {
                    setTimeout(startBot, 5000);
                }
            } else if (connection === 'open') {
                console.log(chalk.green('✅ Bot connecté à WhatsApp!'));
                io.emit('connected', { time: moment().format('HH:mm:ss') });
                
                // Si mode pairage activé, générer code
                if (config.pairingMode && config.pairPhoneNumber) {
                    setTimeout(async () => {
                        try {
                            const code = await sock.requestPairingCode(config.pairPhoneNumber);
                            pairingCode = code.match(/.{1,4}/g).join('-');
                            console.log(chalk.cyan(`📱 Code de pairage: ${pairingCode}`));
                            io.emit('pairing-code', { code: pairingCode });
                        } catch (e) {
                            console.log(chalk.red('❌ Erreur pairage:', e.message));
                        }
                    }, 3000);
                }
            }
        });

        // Gestion messages
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.key.fromMe) continue;
                    
                    stats.messages++;
                    const sender = msg.key.participant || msg.key.remoteJid;
                    stats.users.add(sender);
                    
                    if (msg.key.remoteJid.endsWith('@g.us')) {
                        stats.groups.add(msg.key.remoteJid);
                    }

                    await handleMessage(msg);
                } catch (e) {
                    console.error('Erreur message:', e);
                }
            }
        });

        // Émettre stats toutes les 5 secondes
        setInterval(() => {
            stats.uptime = (Date.now() - startTime) / 1000;
            io.emit('stats', stats);
        }, 5000);

    } catch (error) {
        console.error('Erreur fatale:', error);
        setTimeout(startBot, 10000);
    }
}

// Traiter les messages
async function handleMessage(msg) {
    const content = getMessageContent(msg);
    if (!content) return;

    const { text } = content;
    const prefix = config.prefix;

    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/ +/);
    let commandName = args.shift().toLowerCase();

    // Vérifier alias
    if (aliases.has(commandName)) {
        commandName = aliases.get(commandName);
    }

    const command = commands.get(commandName);
    if (!command) return;

    try {
        stats.commands++;
        console.log(chalk.cyan(`⚡ ${commandName} par ${msg.key.participant || msg.key.remoteJid}`));
        
        await command.execute(sock, msg, args, { 
            config, 
            stats,
            reply: (text) => sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg })
        });
    } catch (error) {
        console.error(`❌ Erreur ${commandName}:`, error);
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '❌ Erreur lors de l\'exécution' 
        }, { quoted: msg });
    }
}

// Extraire contenu message
function getMessageContent(msg) {
    if (msg.message.conversation) {
        return { text: msg.message.conversation, type: 'text' };
    } else if (msg.message.extendedTextMessage) {
        return { text: msg.message.extendedTextMessage.text, type: 'extended' };
    } else if (msg.message.imageMessage?.caption) {
        return { text: msg.message.imageMessage.caption, type: 'image' };
    } else if (msg.message.videoMessage?.caption) {
        return { text: msg.message.videoMessage.caption, type: 'video' };
    }
    return null;
}

// Démarrer serveur web
server.listen(PORT, () => {
    console.log(chalk.green(`🌐 Serveur web: http://localhost:${PORT}`));
    
    // Afficher bannière
    console.log(chalk.yellow('╔════════════════════════════════════╗'));
    console.log(chalk.yellow('║         CHICANO MD v3.0           ║'));
    console.log(chalk.yellow('╠════════════════════════════════════╣'));
    console.log(chalk.yellow(`║ Propriétaire: ${config.ownerName}`));
    console.log(chalk.yellow(`║ Préfixe: ${config.prefix}`));
    console.log(chalk.yellow(`║ Mode: ${config.pairingMode ? 'PAIRING' : 'QR'}`));
    console.log(chalk.yellow('╚════════════════════════════════════╝'));
});

// Charger commandes
loadCommands();

// Démarrer bot
startBot();

// Gestion arrêt
process.on('SIGINT', () => {
    console.log(chalk.yellow('👋 Arrêt du bot...'));
    process.exit();
});
