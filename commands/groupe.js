// Commande TAGALL
module.exports = {
    name: 'tagall',
    async execute(sock, msg, args, { reply }) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return reply('❌ Commande réservée aux groupes');
        }
        
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants;
        const mentions = participants.map(p => p.id);
        
        let text = args.join(' ') || '📢 @all';
        
        await sock.sendMessage(msg.key.remoteJid, { 
            text,
            mentions 
        });
    }
};

// Commande HIDETAG
module.exports = {
    name: 'hidetag',
    async execute(sock, msg, args, { reply }) {
        if (!msg.key.remoteJid.endsWith('@g.us')) {
            return reply('❌ Commande réservée aux groupes');
        }
        
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants;
        const mentions = participants.map(p => p.id);
        
        let text = args.join(' ') || ' ';
        
        await sock.sendMessage(msg.key.remoteJid, { 
            text,
            mentions 
        });
    }
};

// Commande KICK
module.exports = {
    name: 'kick',
    async execute(sock, msg, args, { reply }) {
        if (!msg.key.remoteJid.endsWith('@g.us')) return;
        
        const user = msg.message.extendedTextMessage?.contextInfo?.participant || args[0];
        if (!user) return reply('❌ Mentionne l\'utilisateur');
        
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], 'remove');
        await reply('✅ Utilisateur expulsé');
    }
};

// Commande ADD
module.exports = {
    name: 'add',
    async execute(sock, msg, args, { reply }) {
        if (!args[0]) return reply('❌ Numéro requis');
        
        const number = args[0].replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [number], 'add');
        await reply('✅ Utilisateur ajouté');
    }
};

// Commande PROMOTE
module.exports = {
    name: 'promote',
    async execute(sock, msg, args, { reply }) {
        const user = msg.message.extendedTextMessage?.contextInfo?.participant || args[0];
        if (!user) return;
        
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], 'promote');
        await reply('✅ Utilisateur promu admin');
    }
};

// Commande DEMOTE
module.exports = {
    name: 'demote',
    async execute(sock, msg, args, { reply }) {
        const user = msg.message.extendedTextMessage?.contextInfo?.participant || args[0];
        if (!user) return;
        
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], 'demote');
        await reply('✅ Utilisateur rétrogradé');
    }
};

// Commande LINK
module.exports = {
    name: 'link',
    async execute(sock, msg, args, { reply }) {
        const code = await sock.groupInviteCode(msg.key.remoteJid);
        await reply(`🔗 https://chat.whatsapp.com/${code}`);
    }
};

// Commande CLOSE
module.exports = {
    name: 'close',
    async execute(sock, msg, args, { reply }) {
        await sock.groupSettingUpdate(msg.key.remoteJid, 'announcement');
        await reply('🔒 Groupe fermé');
    }
};

// Commande OPEN
module.exports = {
    name: 'open',
    async execute(sock, msg, args, { reply }) {
        await sock.groupSettingUpdate(msg.key.remoteJid, 'not_announcement');
        await reply('🔓 Groupe ouvert');
    }
};

// Commande SETNAME
module.exports = {
    name: 'setname',
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return;
        const name = args.join(' ');
        await sock.groupUpdateSubject(msg.key.remoteJid, name);
        await reply(`✅ Nom changé: ${name}`);
    }
};
