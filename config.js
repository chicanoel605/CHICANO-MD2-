module.exports = {
    // Info bot
    botName: 'CHICANO MD',
    ownerName: 'EL CHICANO',
    ownerNumber: '2250170084995',
    version: '3.0.0',
    prefix: '.',
    
    // Mode connexion
    pairingMode: true, // true = code de paire, false = QR
    pairPhoneNumber: '2250170084995', // À remplacer par ton numéro
    
    // Clés API
    apiKeys: {
        openai: process.env.OPENAI_KEY || '',
        weather: process.env.WEATHER_KEY || ''
    }
};
