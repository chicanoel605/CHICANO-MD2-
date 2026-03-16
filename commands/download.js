const yts = require('yt-search');
const ytdl = require('ytdl-core');
const axios = require('axios');

// Commande PLAY
module.exports = {
    name: 'play',
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return reply('❌ Titre requis');
        
        const query = args.join(' ');
        await reply('🔍 Recherche...');
        
        try {
            const search = await yts(query);
            if (!search.videos.length) return reply('❌ Aucun résultat');
            
            const video = search.videos[0];
            
            await reply(`🎵 *${video.title}*\n⏱️ ${video.timestamp}\n📊 ${video.views} vues`);
            
            // Version simplifiée sans téléchargement
            await reply(`🔗 Lien: ${video.url}`);
            
        } catch (error) {
            await reply('❌ Erreur recherche');
        }
    }
};

// Commande YTS (recherche YouTube)
module.exports = {
    name: 'yts',
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return;
        
        const query = args.join(' ');
        const search = await yts(query);
        
        let text = `🔍 *Résultats: ${query}*\n\n`;
        search.videos.slice(0, 5).forEach((v, i) => {
            text += `${i+1}. *${v.title}*\n⏱️ ${v.timestamp} | 👤 ${v.author.name}\n\n`;
        });
        
        await reply(text);
    }
};

// Commande TT (TikTok simplifié)
module.exports = {
    name: 'tt',
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return;
        
        const url = args[0];
        if (!url.includes('tiktok.com')) return reply('❌ Lien TikTok invalide');
        
        await reply('📥 Téléchargement...');
        
        try {
            // API publique (à remplacer par une meilleure)
            const response = await axios.get(`https://api.tikdown.com/download?url=${url}`);
            const videoUrl = response.data.video;
            
            await sock.sendMessage(msg.key.remoteJid, { 
                video: { url: videoUrl },
                caption: '🎬 TikTok'
            });
        } catch (error) {
            await reply('❌ Erreur téléchargement');
        }
    }
};
