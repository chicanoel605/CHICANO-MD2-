/**
 * CHICANO MD - WhatsApp Bot pour Katabump
 * Version TESTÉE et CORRIGÉE
 */

// Charger les modules
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const chalk = require('chalk');

// Configuration
const PREFIX = '.';
const BOT_NAME = 'CHICANO MD';
const OWNER = 'EL CHICANO';

// TON NUMÉRO ICI (modifie cette ligne)
const PAIR_PHONE_NUMBER = '2250152611661'; // Mets ton numéro ici

console.log(chalk.green('╔════════════════════════════════════╗'));
console.log(chalk.green('║         CHICANO MD v3.0           ║'));
console.log(chalk.green('╠════════════════════════════════════╣'));
console.log(chalk.green(`║ Propriétaire: ${OWNER}`));
console.log(chalk.green(`║ Numéro: ${PAIR_PHONE_NUMBER}`));
console.log(chalk.green('╚════════════════════════════════════╝'));
console.log('');

// Créer le dossier session
if (!fs.existsSync('./session')) {
    fs.mkdirSync('./session', { recursive: true });
}

// Variable pour le bot
let sock = null;

// Fonction principale
async function startBot() {
    try {
        console.log(chalk.blue('🚀 Démarrage du bot...'));

        // Charger la session
        const { state, saveCreds } = await useMultiFileAuthState('./session');

        // Créer la connexion
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // Pas de QR
            logger: pino({ level: 'silent' }),
            browser: ['CHICANO MD', 'Chrome', '3.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: true
        });

        // Sauvegarder les credentials
        sock.ev.on('creds.update', saveCreds);

        // Gérer la connexion
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(chalk.red('❌ Connexion fermée, reconnexion...'));
                if (shouldReconnect) {
                    setTimeout(startBot, 5000);
                }
            } else if (connection === 'open') {
                console.log(chalk.green('\n✅ BOT CONNECTÉ AVEC SUCCÈS !'));
                console.log(chalk.green(`📱 WhatsApp: ${sock.user?.id || 'Inconnu'}`));
                console.log('');
            }
        });

        // Attendre que le bot soit prêt
        setTimeout(async () => {
            try {
                console.log(chalk.yellow('\n📱 GÉNÉRATION DU CODE DE PAIRAGE...'));
                
                // Vérifier que le socket est défini
                if (!sock) {
                    console.log(chalk.red('❌ Socket non initialisé'));
                    return;
                }

                // Demander le code de pairage
                console.log(chalk.blue(`📞 Numéro: ${PAIR_PHONE_NUMBER}`));
                
                const code = await sock.requestPairingCode(PAIR_PHONE_NUMBER);
                
                // Formater le code (ABCD-EFGH-IJKL)
                const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
                
                // AFFICHAGE TRÈS VISIBLE
                console.log('');
                console.log(chalk.bgGreen.black('══════════════════════════════════════════'));
                console.log(chalk.bgGreen.black('                                          '));
                console.log(chalk.bgGreen.black('   🔑 CODE DE PAIRAGE WHATSAPP 🔑        '));
                console.log(chalk.bgGreen.black('                                          '));
                console.log(chalk.bgGreen.black(`   📱 NUMÉRO: ${PAIR_PHONE_NUMBER}`));
                console.log(chalk.bgGreen.black('                                          '));
                console.log(chalk.bgGreen.black(`   🎯 CODE: ${formattedCode}`));
                console.log(chalk.bgGreen.black('                                          '));
                console.log(chalk.bgGreen.black('   ⚡ INSTRUCTIONS :'));
                console.log(chalk.bgGreen.black('   1. Ouvrir WhatsApp sur ton téléphone'));
                console.log(chalk.bgGreen.black('   2. Menu → Appareils connectés'));
                console.log(chalk.bgGreen.black('   3. Cliquer sur "Connecter un appareil"'));
                console.log(chalk.bgGreen.black('   4. Entrer CE code'));
                console.log(chalk.bgGreen.black('                                          '));
                console.log(chalk.bgGreen.black('══════════════════════════════════════════'));
                console.log('');

                // Sauvegarder dans un fichier
                fs.writeFileSync('./code.txt', 
                    `Code: ${formattedCode}\nNuméro: ${PAIR_PHONE_NUMBER}\nDate: ${new Date().toLocaleString()}`
                );
                console.log(chalk.green('✅ Code sauvegardé dans code.txt'));

            } catch (error) {
                console.log(chalk.red('\n❌ ERREUR DE GÉNÉRATION DU CODE:'));
                console.log(chalk.red(error.message));
                console.log('');
                console.log(chalk.yellow('📋 DIAGNOSTIC:'));
                console.log(chalk.yellow(`- Numéro: ${PAIR_PHONE_NUMBER}`));
                console.log(chalk.yellow(`- Longueur: ${PAIR_PHONE_NUMBER.length} chiffres`));
                console.log(chalk.yellow(`- Heure: ${new Date().toLocaleString()}`));
                console.log('');
                console.log(chalk.yellow('🔧 SOLUTIONS POSSIBLES:'));
                console.log(chalk.yellow('1. Vérifie que le numéro est correct (2250152611661)'));
                console.log(chalk.yellow('2. Redémarre le bot'));
                console.log(chalk.yellow('3. Attends 1 minute et réessaie'));
            }
        }, 3000); // Attendre 3 secondes avant de générer le code

        // Gérer les messages (commandes)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                try {
                    if (!msg.message || msg.key.fromMe) continue;

                    const text = msg.message.conversation || 
                                msg.message.extendedTextMessage?.text || '';

                    if (text === '.ping') {
                        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' });
                    }
                    
                    if (text === '.menu' || text === '.help') {
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: `╔══════════════════════╗
║     CHICANO MD      ║
╠══════════════════════╣
║ 👤 Bot: Connecté
║ 📱 Code: Dans les logs
║ ⚡ Commandes:
║   • .ping - Test
║   • .menu - Menu
╚══════════════════════╝`
                        });
                    }
                } catch (e) {
                    console.log('Erreur message:', e.message);
                }
            }
        });

    } catch (error) {
        console.log(chalk.red('❌ Erreur fatale:'), error.message);
        setTimeout(startBot, 10000);
    }
}

// Démarrer le bot
startBot();

// Garder le processus actif
setInterval(() => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    // Afficher l'uptime toutes les 5 minutes
    if (Math.floor(uptime) % 300 === 0) {
        console.log(chalk.blue(`⏱️ Uptime: ${hours}h ${minutes}m`));
    }
}, 1000);

// Gérer l'arrêt
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Arrêt du bot...'));
    process.exit();
});
