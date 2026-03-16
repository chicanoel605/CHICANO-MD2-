// Commande GETPP
module.exports = {
    name: 'getpp',
    ownerOnly: true,
    async execute(sock, msg, args, { reply }) {
        const user = msg.message.extendedTextMessage?.contextInfo?.participant || msg.key.participant || msg.key.remoteJid;
        
        try {
            const ppUrl = await sock.profilePictureUrl(user, 'image');
            await sock.sendMessage(msg.key.remoteJid, { 
                image: { url: ppUrl },
                caption: '👤 Photo de profil'
            });
        } catch {
            await reply('❌ Pas de photo');
        }
    }
};

// Commande JOIN
module.exports = {
    name: 'join',
    ownerOnly: true,
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return;
        
        const link = args[0];
        const code = link.split('https://chat.whatsapp.com/')[1];
        
        if (!code) return reply('❌ Lien invalide');
        
        try {
            const res = await sock.groupAcceptInvite(code);
            await reply(`✅ Rejoint groupe: ${res}`);
        } catch {
            await reply('❌ Impossible de rejoindre');
        }
    }
};

// Commande LEAVE
module.exports = {
    name: 'leave',
    ownerOnly: true,
    async execute(sock, msg, args, { reply }) {
        if (!msg.key.remoteJid.endsWith('@g.us')) return;
        
        await reply('👋 Au revoir!');
        await sock.groupLeave(msg.key.remoteJid);
    }
};
