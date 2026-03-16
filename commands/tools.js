const axios = require('axios');

// Commande WEATHER
module.exports = {
    name: 'weather',
    aliases: ['météo', 'meteo'],
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return reply('❌ Ville?');
        
        const city = args.join(' ');
        
        try {
            // API publique gratuite
            const response = await axios.get(`https://goweather.herokuapp.com/weather/${encodeURIComponent(city)}`);
            const data = response.data;
            
            const text = `🌤 *Météo: ${city}*\n\n` +
                        `🌡 Température: ${data.temperature || 'N/A'}\n` +
                        `💨 Vent: ${data.wind || 'N/A'}\n` +
                        `📝 Description: ${data.description || 'N/A'}`;
            
            await reply(text);
        } catch (error) {
            await reply('❌ Ville non trouvée');
        }
    }
};

// Commande STICKER
module.exports = {
    name: 'sticker',
    aliases: ['s'],
    async execute(sock, msg, args, { reply }) {
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || !quoted.imageMessage) {
            return reply('❌ Réponds à une image');
        }
        
        await reply('🎨 Création sticker...');
        
        // Télécharger l'image
        const buffer = await sock.downloadMediaMessage(msg.message.extendedTextMessage.contextInfo.quotedMessage);
        
        // Envoyer comme sticker
        await sock.sendMessage(msg.key.remoteJid, {
            sticker: buffer
        });
    }
};

// Commande QR
module.exports = {
    name: 'qr',
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return reply('❌ Texte?');
        
        const text = args.join(' ');
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
        
        await sock.sendMessage(msg.key.remoteJid, {
            image: { url },
            caption: '📱 QR Code'
        });
    }
};

// Commande TRANSLATE
module.exports = {
    name: 'translate',
    aliases: ['tr'],
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return;
        
        const text = args.join(' ');
        
        try {
            const response = await axios.get(`https://api.mymemory.translated.net/get`, {
                params: {
                    q: text,
                    langpair: 'auto|fr'
                }
            });
            
            const translation = response.data.responseData.translatedText;
            await reply(`📝 *Traduction:*\n${translation}`);
        } catch (error) {
            await reply('❌ Erreur traduction');
        }
    }
};
