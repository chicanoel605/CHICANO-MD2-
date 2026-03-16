const axios = require('axios');

// Commande AI (GPT)
module.exports = {
    name: 'ai',
    async execute(sock, msg, args, { config, reply }) {
        if (!args.length) return reply('❌ Question?');
        
        const question = args.join(' ');
        await reply('🧠 Réflexion...');
        
        try {
            // Utiliser API publique gratuite (exemple)
            const response = await axios.get(`https://api.simsimi.vn/v1/simtalk`, {
                params: {
                    text: question,
                    lc: 'fr'
                }
            });
            
            await reply(`🤖 ${response.data.message || 'Je ne sais pas'}`);
        } catch (error) {
            await reply('❌ Erreur IA');
        }
    }
};

// Commande IMAGE (génération)
module.exports = {
    name: 'image',
    async execute(sock, msg, args, { reply }) {
        if (!args.length) return;
        
        const prompt = args.join(' ');
        await reply('🎨 Génération...');
        
        // Simuler génération d'image
        await reply('🔗 https://picsum.photos/400/400?random=' + Date.now());
    }
};
