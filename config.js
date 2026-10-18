module.exports = {
  // توكن البوت الخاص بك من Discord Developer Portal
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  CLIENT_ID: process.env.CLIENT_ID || 'ضع_CLIENT_ID_البوت',
  CLIENT_SECRET: process.env.CLIENT_SECRET || 'ضع_CLIENT_SECRET_البوت',
  
  // روابط لوحة التحكم
  CALLBACK_URL: 'http://localhost:3000/auth/discord/callback',
  PORT: process.env.PORT || 3000,
  
  // إعدادات السيرفر والرومات
  GUILD_ID: 'ضع_ID_السيرفر_هنا',
  LOGS_CHANNEL_ID: 'ضع_ID_روم_السجلات_والتنبيهات',
  KYC_ADMIN_ROLE_ID: 'ضع_ID_رتبة_الأدمن'
};
