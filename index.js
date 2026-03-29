const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs");

const app = express();

// ===== Web Server (تشغيل 24/7) =====
app.get("/", (req, res) => {
  res.send("Bot is alive 🔥");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Web server running"));

// ===== Anti Crash =====
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// ===== إعدادات =====
const TOKEN = process.env.TOKEN; // مهم تحطه في ENV
const CATEGORY_ID = "1487378875733381243";
const STAFF_ROLE = "1487380376983965827";
const ADMIN_ROLE = "1487395774726803536";
const OWNER_ROLE = "1487396319340396636";
const LOG_CHANNEL = "1487323827170967584";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let tickets = new Map();

// ===== تشغيل البوت =====
client.on("ready", () => {
  console.log(`✅ ${client.user.tag} شغال`);
});

// ===== رسالة فتح التكت =====
client.on("messageCreate", async (msg) => {
  if (msg.content === "!ticket") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("فتح تذكرة 🎫")
        .setStyle(ButtonStyle.Primary)
    );

    msg.channel.send({
      content: "اضغط لفتح تذكرة",
      components: [row]
    });
  }
});

// ===== الأزرار =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  const userId = interaction.user.id;

  // ===== فتح تذكرة =====
  if (interaction.customId === "open_ticket") {
    if (tickets.has(userId)) {
      return interaction.reply({
        content: "❌ عندك تذكرة مفتوحة",
        ephemeral: true
      });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: userId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: STAFF_ROLE,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    tickets.set(userId, channel.id);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("إغلاق").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("call_owner").setLabel("استدعاء اونر").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("call_admin").setLabel("استدعاء إداري").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("call_support").setLabel("استدعاء سبورت").setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle("🎫 الدعم الفني")
      .setDescription("اكتب مشكلتك وسيتم الرد عليك")
      .setColor("Blue");

    channel.send({
      content: `<@${userId}> | <@&${STAFF_ROLE}>`,
      embeds: [embed],
      components: [buttons]
    });

    interaction.reply({
      content: "✅ تم فتح التذكرة",
      ephemeral: true
    });
  }

  // ===== استلام =====
  if (interaction.customId === "claim") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
      return interaction.reply({
        content: "❌ فقط السبورت يقدر يستلم",
        ephemeral: true
      });
    }

    await interaction.channel.setName(`claimed-${interaction.user.username}`);

    interaction.reply(`✅ ${interaction.user} استلم التذكرة`);

    const log = interaction.guild.channels.cache.get(LOG_CHANNEL);
    if (log) log.send(`📥 ${interaction.user.tag} استلم تذكرة`);
  }

  // ===== إغلاق =====
  if (interaction.customId === "close") {
    if (
      !interaction.member.roles.cache.has(STAFF_ROLE) &&
      !interaction.member.roles.cache.has(ADMIN_ROLE)
    ) {
      return interaction.reply({
        content: "❌ ما عندك صلاحية",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "⏳ جاري حفظ التذكرة...",
      ephemeral: true
    });

    const messages = await interaction.channel.messages.fetch({ limit: 200 });
    let content = "";

    messages.reverse().forEach(m => {
      content += `${m.author.tag}: ${m.content}\n`;
    });

    const fileName = `transcript-${interaction.channel.id}.txt`;
    fs.writeFileSync(fileName, content);

    const log = interaction.guild.channels.cache.get(LOG_CHANNEL);
    if (log) {
      log.send({
        content: `📁 Transcript للتذكرة`,
        files: [fileName]
      });
    }

    setTimeout(() => {
      for (let [u, c] of tickets) {
        if (c === interaction.channel.id) tickets.delete(u);
      }
      interaction.channel.delete();
    }, 5000);
  }

  // ===== استدعاء =====
  if (interaction.customId === "call_owner") {
    interaction.reply(`<@&${OWNER_ROLE}> 🚨 تم استدعاء الأونر`);
  }

  if (interaction.customId === "call_admin") {
    interaction.reply(`<@&${ADMIN_ROLE}> 🚨 تم استدعاء الإداري`);
  }

  if (interaction.customId === "call_support") {
    interaction.reply(`<@&${STAFF_ROLE}> 🚨 تم استدعاء السبورت`);
  }
});

// ===== تشغيل =====
client.login(TOKEN);
