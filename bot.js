const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const config = require('./config');

// --- 1. INITIALIZE DISCORD BOT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// قاعدة بيانات مؤقتة في الذاكرة (In-Memory Database)
const db = {
  accounts: [
    {
      id: 'acc-1',
      title: '⚡ حساب ببجي موبايل لفل 79 - ام فور الجوكر مكس + بدلة ميثك',
      platform: 'PUBG Mobile',
      price: 5200,
      sellerName: 'صاصا⚡',
      sellerDiscordId: '123456789012345678',
      description: 'حساب مشحون من السيزون 3، ام فور الجوكر لفل أقصى + سيارة ميثك.',
      status: 'available'
    }
  ],
  verifiedUsers: new Set(),
  kycRequests: [],
  transactions: []
};

// --- 2. PASSPORT DISCORD OAUTH2 ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
  callbackURL: config.CALLBACK_URL,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// --- 3. EXPRESS DASHBOARD SERVER ---
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'sasa_store_secret_key_2026',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/dashboard');
});

app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ loggedIn: false });
  const isVerified = db.verifiedUsers.has(req.user.id);
  res.json({
    loggedIn: true,
    user: req.user,
    isKycVerified: isVerified
  });
});

app.get('/api/accounts', (req, res) => {
  res.json(db.accounts);
});

// KYC Submit Endpoint from Dashboard
app.post('/api/kyc/submit', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('غير مصرح');
  const { fullName, nationalId, idFront, idBack, selfie } = req.body;

  if (!nationalId || nationalId.length !== 14) {
    return res.status(400).json({ error: 'الرقم القومي يجب أن يتكون من 14 رقم بالضبط' });
  }

  const kycData = {
    id: `kyc-${Date.now()}`,
    discordId: req.user.id,
    userName: req.user.username,
    fullName,
    nationalId,
    status: 'pending'
  };

  db.kycRequests.push(kycData);

  // إرسال تنبيه لروم الإدارة في ديسكورد
  const logChannel = client.channels.cache.get(config.LOGS_CHANNEL_ID);
  if (logChannel) {
    const embed = new EmbedBuilder()
      .setTitle('🔍 طلب توثيق هوية جديد (KYC)')
      .setColor('#facc15')
      .addFields(
        { name: 'المستخدم', value: `<@${req.user.id}> (${req.user.username})`, inline: true },
        { name: 'الاسم بالبطاقة', value: fullName, inline: true },
        { name: 'الرقم القومي', value: `\`${nationalId}\``, inline: true }
      )
      .setFooter({ text: 'ستور صاصا ⚡ - نظام منع النصب' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_kyc_${req.user.id}`)
        .setLabel('قبول التوثيق ✓')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_kyc_${req.user.id}`)
        .setLabel('رفض ✕')
        .setStyle(ButtonStyle.Danger)
    );

    logChannel.send({ embeds: [embed], components: [row] });
  }

  res.json({ success: true, message: 'تم إرسال بيانات التوثيق للإدارة لمراجعتها!' });
});

// --- 4. DISCORD BOT EVENTS & COMMANDS ---
client.once('ready', () => {
  console.log(`✅ تم تشغيل بوت ستور صاصا بنجاح: ${client.user.tag}`);
});

// التفاعل مع أزرار ديسكورد (القبول والرفض وفتح تذاكر الشراء)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // توثيق البائع من ديسكورد
  if (interaction.customId.startsWith('approve_kyc_')) {
    const userId = interaction.customId.split('approve_kyc_')[1];
    db.verifiedUsers.add(userId);

    await interaction.reply({ content: `✅ تم قبول توثيق هويّة المستخدم <@${userId}> بنجاح!`, ephemeral: true });

    // إرسال رسالة خاصة للمستخدم
    try {
      const targetUser = await client.users.fetch(userId);
      targetUser.send('⚡ **تهانينا!** تم قبول توثيق هوياك برقمك القومي في **ستور صاصا ⚡**. يمكنك الآن عرض حساباتك للبيع.');
    } catch (e) {}
  }

  // شراء حساب وفتح تذكرة وساطة (Ticket Escrow)
  if (interaction.customId.startsWith('buy_account_')) {
    const accId = interaction.customId.split('buy_account_')[1];
    const account = db.accounts.find(a => a.id === accId);

    if (!account) return interaction.reply({ content: 'عذراً، هذا الحساب لم يعد متوفراً.', ephemeral: true });

    const guild = interaction.guild;
    const ticketChannel = await guild.channels.create({
      name: `وساطة-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    const escrowEmbed = new EmbedBuilder()
      .setTitle(`⚡ تذكرة وساطة شراء - ${account.title}`)
      .setColor('#00f2fe')
      .setDescription(`مرحباً بك <@${interaction.user.id}>! تم فتح هذه التذكرة لإتمام عملية الشراء بنظام الوسيط الآمن.`)
      .addFields(
        { name: 'تفاصيل الحساب', value: account.description },
        { name: 'المبلغ المطلوب', value: `\`${account.price} ج.م\` عبر فودافون كاش` },
        { name: 'رقم محفظة الوسيط الرسمية', value: '`01099887766`' }
      )
      .setFooter({ text: 'قم بتحويل المبلغ وإرفاق صورة الإيصال هنا ليتأكد الأدمن وسلمك البيانات فوراً.' });

    await ticketChannel.send({ embeds: [escrowEmbed] });
    await interaction.reply({ content: `✅ تم إنشاء تذكرة الوساطة بنجاح: ${ticketChannel}`, ephemeral: true });
  }
});

// أمر لعرض الحسابات داخل ديسكورد
client.on('messageCreate', async (message) => {
  if (message.content === '!ستور' || message.content === '!store') {
    const embed = new EmbedBuilder()
      .setTitle('⚡ ستور صاصا - سوق بيع وشراء الحسابات الموثوقة')
      .setColor('#ff007f')
      .setDescription('جميع البائعين في المتجر موثقون برقم البطاقة القومية وسيلفي الوجه لمنع النصب تماماً.');

    const rows = [];
    db.accounts.forEach(acc => {
      embed.addFields({
        name: `${acc.title} (${acc.price} ج.م)`,
        value: `المنصة: ${acc.platform} | البائع: ${acc.sellerName}`
      });

      const btn = new ButtonBuilder()
        .setCustomId(`buy_account_${acc.id}`)
        .setLabel(`شراء ${acc.platform} (${acc.price} ج.م)`)
        .setStyle(ButtonStyle.Primary);

      rows.push(new ActionRowBuilder().addComponents(btn));
    });

    message.channel.send({ embeds: [embed], components: rows });
  }
});

// تشغيل سيرفر الويب والبوت
app.listen(config.PORT, () => {
  console.log(`🌐 لوحة التحكم تعمل الآن على الرابط: http://localhost:${config.PORT}`);
});

client.login(config.DISCORD_TOKEN);
