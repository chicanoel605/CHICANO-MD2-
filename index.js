/**
 * CHICANO MD - WhatsApp Bot pour Katabump
 * Version 3.0.0 - CORRIGÉ
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
const io = socketIO(server, {
    cors: {
        origin: "*", // Permettre toutes les origines
        methods: ["GET", "POST"]
    }
});

// IMPORTANT: Écouter sur toutes les interfaces
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Middleware pour logger les requêtes
app.use((req, res, next) => {
    console.log(chalk.blue(`📡 ${req.method} ${req.url}`));
    next();
});

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
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
    }
    
    const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.name && command.execute) {
                commands.set(command.name, command);
                if (command.aliases) {
                    command.aliases.forEach(alias => aliases.set(alias, command.name));
                }
                console.log(chalk.green(`✅ Commande chargée: ${command.name}`));
            }
        } catch (e) {
            console.log(chalk.red(`❌ Erreur chargement ${file}:`, e.message));
        }
    }
    console.log(chalk.green(`✅ Total: ${commands.size} commandes`));
}

// Route principale
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CHICANO MD</title>
                <style>
                    body { font-family: Arial; background: #667eea; color: white; text-align: center; padding: 50px; }
                    .container { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; }
                    h1 { font-size: 3em; }
                    .status { color: #4CAF50; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 CHICANO MD</h1>
                    <p>Bot WhatsApp - Version 3.0.0</p>
                    <p>Statut: <span class="status">EN LIGNE</span></p>
                    <p>Le bot est opérationnel !</p>
                    <p>URL: ${req.protocol}://${req.get('host')}</p>
                </div>
            </body>
            </html>
        `);
    }
});

// Route status
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
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        host: req.get('host'),
        url: `${req.protocol}://${req.get('host')}`
    });
});

// Route pour le code de pairage
app.post('/api/pair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log(chalk.yellow(`📱 Demande de pairage pour: ${phoneNumber}`));
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Numéro requis' });
        }

        if (!sock) {
            return res.status(500).json({ error: 'Bot pas encore prêt' });
        }

        const code = await sock.requestPairingCode(phoneNumber);
        const formattedCode = code.match(/.{1,4}/g).join('-');
        
        pairingCode = formattedCode;
        io.emit('pairing-code', { code: formattedCode });
        
        console.log(chalk.green(`✅ Code généré: ${formattedCode}`));
        res.json({ success: true, pairingCode: formattedCode });
    } catch (error) {
        console.log(chalk.red('❌ Erreur pairage:', error.message));
        res.status(500).json({ error: error.message });
    }
});

// Route pour vérifier
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
});

// Fonction pour démarrer le bot
async function startBot() {
    try {
        console.log(chalk.blue('🚀 Démarrage de CHICANO MD...'));
        
        // Créer dossier session s'il n'existe pas
        if (!fs.existsSync('session')) {
            fs.mkdirSync('session', { recursive: true });
        }
        
        // Créer dossier temp
        if (!fs.existsSync('temp')) {
            fs.mkdirSync('temp', { recursive: true });
        }
        
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
                console.log(chalk.yellow('📱 QR Code généré'));
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
                
                // Si mode pairage activé, générer code après quelques secondes
                if (config.pairingMode && config.pairPhoneNumber) {
                    setTimeout(async () => {
                        try {
                            console.log(chalk.yellow(`📱 Génération code pour: ${config.pairPhoneNumber}`));
                            const code = await sock.requestPairingCode(config.pairPhoneNumber);
                            pairingCode = code.match(/.{1,4}/g).join('-');
                            console.log(chalk.green(`✅ Code: ${pairingCode}`));
                            io.emit('pairing-code', { code: pairingCode });
                        } catch (e) {
                            console.log(chalk.red('❌ Erreur pairage automatique:', e.message));
                        }
                    }, 5000);
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
    if (msg.message?.conversation) {
        return { text: msg.message.conversation, type: 'text' };
    } else if (msg.message?.extendedTextMessage?.text) {
        return { text: msg.message.extendedTextMessage.text, type: 'extended' };
    } else if (msg.message?.imageMessage?.caption) {
        return { text: msg.message.imageMessage.caption, type: 'image' };
    } else if (msg.message?.videoMessage?.caption) {
        return { text: msg.message.videoMessage.caption, type: 'video' };
    }
    return null;
}

// Émettre stats toutes les 5 secondes
setInterval(() => {
    if (io) {
        stats.uptime = (Date.now() - startTime) / 1000;
        io.emit('stats', {
            messages: stats.messages,
            commands: stats.commands,
            users: stats.users.size,
            groups: stats.groups.size,
            uptime: stats.uptime
        });
    }
}, 5000);

// Démarrer serveur web
server.listen(PORT, HOST, () => {
    console.log(chalk.green('╔════════════════════════════════════╗'));
    console.log(chalk.green('║         CHICANO MD v3.0           ║'));
    console.log(chalk.green('╠════════════════════════════════════╣'));
    console.log(chalk.green(`║ Propriétaire: ${config.ownerName}`));
    console.log(chalk.green(`║ Préfixe: ${config.prefix}`));
    console.log(chalk.green(`║ Mode: ${config.pairingMode ? 'PAIRING' : 'QR'}`));
    console.log(chalk.green(`║ Port: ${PORT}`));
    console.log(chalk.green(`║ Host: ${HOST}`));
    console.log(chalk.green(`║ URL: http://${HOST}:${PORT}`));
    console.log(chalk.green('╚════════════════════════════════════╝'));
    
    // Afficher l'URL réelle
    const url = process.env.APP_URL || `http://localhost:${PORT}`;
    console.log(chalk.yellow(`\n📱 Accède à l'URL fournie par Katabump`));
    console.log(chalk.yellow(`🌐 Si tu es sur Katabump, utilise l'URL: ${process.env.APP_URL || 'https://ton-site.katabump.com'}`));
});

// Charger commandes
loadCommands();

// Démarrer bot
startBot();

// Gestion arrêt
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Arrêt du bot...'));
    process.exit();
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Arrêt demandé...'));
    process.exit();
});
