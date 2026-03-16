/**
 * CHICANO MD - WhatsApp Bot pour Katabump
 * Version 3.0.0 - Mode Console Directe
 * Le code de paire apparaît directement dans les logs Katabump
 */

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const config = {
    botName: process.env.BOT_NAME || 'CHICANO MD',
    ownerName: process.env.OWNER_NAME || 'EL CHICANO',
    ownerNumber: process.env.OWNER_NUMBER || '22600000000',
    version: '3.0.0',
    prefix: process.env.PREFIX || '.',
    pairingMode: true,
    pairPhoneNumber: process.env.PAIR_PHONE_NUMBER || '' // IMPORTANT: À remplir dans les variables Katabump
};

// Variables globales
let sock = null;
let startTime = Date.now();

// Créer les dossiers nécessaires
if (!fs.existsSync('session')) fs.mkdirSync('session', { recursive: true });
if (!fs.existsSync('temp')) fs.mkdirSync('temp', { recursive: true });

// Charger les commandes (optionnel - tu peux ajouter tes commandes ici)
const commands = new Map();

// Afficher la bannière de démarrage
console.log(chalk.green('╔════════════════════════════════════╗'));
console.log(chalk.green('║         CHICANO MD v3.0           ║'));
console.log(chalk.green('╠════════════════════════════════════╣'));
console.log(chalk.green(`║ Propriétaire: ${config.ownerName}`));
console.log(chalk.green(`║ Préfixe: ${config.prefix}`));
console.log(chalk.green(`║ Mode: PAIRING CODE`));
console.log(chalk.green(`║ Numéro: ${config.pairPhoneNumber || 'NON DÉFINI'}`));
console.log(chalk.green('╚════════════════════════════════════╝'));
console.log('');

// Fonction principale
async function startBot() {
    try {
        console.log(chalk.blue('🚀 Démarrage du bot...'));
        
        const { state, saveCreds } = await useMultiFileAuthState('session');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false, // Pas de QR
            browser: ['CHICANO MD', 'Safari', config.version]
        });

        // Sauvegarde des credentials
        sock.ev.on('creds.update', saveCreds);

        // Gestion connexion
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(chalk.red(`❌ Connexion fermée, reconnexion dans 5s...`));
                
                if (shouldReconnect) {
                    setTimeout(startBot, 5000);
                }
            } else if (connection === 'open') {
                console.log(chalk.green('\n✅✅✅ BOT CONNECTÉ AVEC SUCCÈS ✅✅✅'));
                console.log(chalk.green(`📱 Connecté en tant que: ${sock.user.id}`));
                console.log('');
            }
        });

        // Attendre que la connexion soit prête
        setTimeout(async () => {
            if (config.pairingMode && config.pairPhoneNumber) {
                try {
                    console.log(chalk.yellow('\n📱 GÉNÉRATION DU CODE DE PAIRAGE...'));
                    console.log(chalk.yellow('═'.repeat(50)));
                    
                    // Générer le code
                    const code = await sock.requestPairingCode(config.pairPhoneNumber);
                    const formattedCode = code.match(/.{1,4}/g).join('-');
                    
                    // AFFICHAGE TRÈS VISIBLE DU CODE
                    console.log('');
                    console.log(chalk.bgGreen.black('══════════════════════════════════════════'));
                    console.log(chalk.bgGreen.black('                                          '));
                    console.log(chalk.bgGreen.black('   🔑 CODE DE PAIRAGE WHATSAPP 🔑        '));
                    console.log(chalk.bgGreen.black('                                          '));
                    console.log(chalk.bgGreen.black(`   📱 NUMÉRO: ${config.pairPhoneNumber}     `));
                    console.log(chalk.bgGreen.black('                                          '));
                    console.log(chalk.bgGreen.black(`   🎯 CODE: ${formattedCode}           `));
                    console.log(chalk.bgGreen.black('                                          '));
                    console.log(chalk.bgGreen.black('   ⚡ ENTRE CE CODE DANS WHATSAPP        '));
                    console.log(chalk.bgGreen.black('   📲 Menu > Appareils connectés         '));
                    console.log(chalk.bgGreen.black('                                          '));
                    console.log(chalk.bgGreen.black('══════════════════════════════════════════'));
                    console.log('');
                    
                    // Aussi en blanc simple pour les logs
                    console.log('🔑 CODE DE PAIRAGE:', formattedCode);
                    console.log('📱 À entrer dans WhatsApp -> Appareils connectés');
                    console.log('');
                    
                } catch (e) {
                    console.log(chalk.red('❌ Erreur génération code:'), e.message);
                    console.log(chalk.yellow('Vérifie que le numéro est correct:'), config.pairPhoneNumber);
                }
            } else {
                console.log(chalk.red('❌ NUMÉRO NON CONFIGURÉ'));
                console.log(chalk.yellow('Ajoute PAIR_PHONE_NUMBER dans les variables Katabump'));
            }
        }, 5000);

        // Gestion des messages (optionnel - pour les commandes)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.key.fromMe) continue;
                    
                    // Ici tu peux ajouter le traitement des commandes
                    // Exemple simple:
                    const text = msg.message.conversation || '';
                    if (text === '.ping') {
                        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' });
                    }
                    
                } catch (e) {
                    console.error('Erreur:', e);
                }
            }
        });

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        setTimeout(startBot, 10000);
    }
}

// Démarrer
startBot();

// Garder le processus actif
setInterval(() => {
    // Juste pour garder le processus en vie
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    // Afficher l'uptime toutes les 5 minutes (pour voir que le bot tourne)
    if (uptime % 300 === 0) {
        console.log(chalk.blue(`⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`));
    }
}, 1000);

// Gestion arrêt
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Arrêt du bot...'));
    process.exit();
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Arrêt demandé...'));
    process.exit();
});
