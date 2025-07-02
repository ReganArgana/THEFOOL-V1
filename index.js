import { Client, GatewayIntentBits, Partials, Routes, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import express from 'express';
import fetch from 'node-fetch';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

let data = {};
const DATA_FILE = './data.json';

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
  }
}
loadData();

function getUser(userId) {
  if (!data[userId]) {
    data[userId] = { uang: 0, ikan: [], alat: [], umpan: 0 };
  }
  return data[userId];
}

const ikanList = [
  { nama: "Ikan Biasa", harga: 10, rarity: "common" },
  { nama: "Ikan Lumayan", harga: 20, rarity: "common" },
  { nama: "Ikan Nila", harga: 30, rarity: "common" },
  { nama: "Ikan Lele", harga: 35, rarity: "common" },
  { nama: "Ikan Mas", harga: 50, rarity: "uncommon" },
  { nama: "Ikan Koi", harga: 60, rarity: "uncommon" },
  { nama: "Ikan Cupang", harga: 80, rarity: "rare" },
  { nama: "Ikan Paus Mini", harga: 120, rarity: "rare" },
  { nama: "Ikan Legenda", harga: 200, rarity: "legendary" },
  { nama: "Ikan Dewa Air", harga: 300, rarity: "mythical" }
];

const alatList = [
  { nama: "Kail Biasa", bonus: 0 },
  { nama: "Kail Tajam", bonus: 10 },
  { nama: "Jaring Sakti", bonus: 15 },
  { nama: "Tombak Legenda", bonus: 20 }
];

const toko = {
  alat: alatList,
  umpan: { nama: "Umpan", harga: 25 }
};

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("pemula").setDescription("Dapatkan alat dan umpan dasar"),
    new SlashCommandBuilder().setName("toko").setDescription("Lihat item di toko"),
    new SlashCommandBuilder().setName("beli").setDescription("Beli item dari toko").addStringOption(opt => opt.setName("item").setDescription("Nama item").setRequired(true)),
    new SlashCommandBuilder().setName("jual").setDescription("Jual semua ikan"),
    new SlashCommandBuilder().setName("uang").setDescription("Lihat jumlah uangmu"),
    new SlashCommandBuilder().setName("inv").setDescription("Lihat tas / inventaris"),
    new SlashCommandBuilder().setName("mancing").setDescription("Mulai memancing"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Lihat pemancing terkaya"),
    new SlashCommandBuilder().setName("status").setDescription("Lihat status semua member"),
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Slash commands registered.");
}

client.on("ready", () => {
  console.log(`Bot online sebagai ${client.user.tag}`);
  registerCommands();
});

// Logic memancing
function mancing(user) {
  if (user.umpan < 1) return { error: "Kamu butuh umpan!" };
  user.umpan--;

  let bonus = 0;
  for (let alat of user.alat) {
    const a = alatList.find(a => a.nama === alat);
    if (a) bonus += a.bonus;
  }

  const peluang = Math.random() * 100 + bonus;
  let tangkapan;

  if (peluang > 5) tangkapan = ikanList.find(i => i.rarity === "mythical");
  else if (peluang > 5) tangkapan = ikanList.find(i => i.rarity === "legendary");
  else if (peluang > 65) tangkapan = ikanList.find(i => i.rarity === "rare");
  else if (peluang > 80) tangkapan = ikanList.find(i => i.rarity === "uncommon");
  else tangkapan = ikanList[Math.floor(Math.random() * 4)];

  const berat = Math.floor(Math.random() * 100) + 1;
  const harga = tangkapan.harga * berat;

  user.ikan.push({ ...tangkapan, berat, harga });
  saveData();
  return { ikan: tangkapan.nama, berat, harga };
}

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;
  const user = getUser(i.user.id);

  switch (i.commandName) {
    case "pemula":
      user.umpan += 5;
      user.alat.push("Kail Biasa");
      saveData();
      await i.reply("🎣 Kamu menerima 5 umpan dan Kail Biasa!");
      break;

    case "toko":
      const items = toko.alat.map(a => `🔧 ${a.nama} (+${a.bonus}% rare)`).join("\n");
      await i.reply(`🛒 **Toko**\n${items}\n\n🎯 Umpan - 10 koin`);
      break;

    case "beli":
      const item = i.options.getString("item");
      if (item.toLowerCase() === "umpan") {
        if (user.uang >= 10) {
          user.uang -= 10;
          user.umpan += 1;
          saveData();
          await i.reply("✅ Kamu membeli 1 umpan!");
        } else await i.reply("❌ Uangmu tidak cukup!");
      } else {
        const alat = alatList.find(a => a.nama.toLowerCase() === item.toLowerCase());
        if (alat) {
          const harga = alat.bonus * 20;
          if (user.uang >= harga) {
            user.uang -= harga;
            user.alat.push(alat.nama);
            saveData();
            await i.reply(`✅ Kamu membeli ${alat.nama}!`);
          } else await i.reply("❌ Uangmu tidak cukup!");
        } else await i.reply("❌ Item tidak ditemukan.");
      }
      break;

    case "jual":
      if (user.ikan.length === 0) return await i.reply("🎣 Kamu tidak punya ikan.");
      const total = user.ikan.reduce((a, b) => a + b.harga, 0);
      user.uang += total;
      user.ikan = [];
      saveData();
      await i.reply(`💰 Kamu menjual semua ikan dan mendapat ${total} koin!`);
      break;

    case "uang":
      await i.reply(`💵 Uangmu: ${user.uang} koin`);
      break;

    case "inv":
      await i.reply(`🎒 Umpan: ${user.umpan}\nAlat: ${user.alat.join(", ") || "Tidak ada"}\nIkan: ${user.ikan.length} ekor`);
      break;

    case "mancing":
      const hasil = mancing(user);
      if (hasil.error) return await i.reply("❌ " + hasil.error);
      await i.reply(`🎣 Kamu menangkap **${hasil.ikan}** seberat **${hasil.berat}kg** senilai **${hasil.harga} koin**!`);
      break;

    case "leaderboard":
      const lb = Object.entries(data)
        .map(([id, d]) => ({ id, uang: d.uang }))
        .sort((a, b) => b.uang - a.uang)
        .slice(0, 10);
      const embed = new EmbedBuilder()
        .setTitle("🏆 Leaderboard Pemancing")
        .setColor("Gold")
        .setDescription(lb.map((u, i) => `**${i + 1}.** <@${u.id}> - ${u.uang} koin`).join("\n"));
      await i.reply({ embeds: [embed] });
      break;

    case "status":
      const guild = await client.guilds.fetch(i.guildId);
      await guild.members.fetch();
      const statusMap = { online: 0, idle: 0, dnd: 0, offline: 0 };
      guild.members.cache.forEach(m => {
        const s = m.presence?.status || "offline";
        statusMap[s]++;
      });
      const statusEmbed = new EmbedBuilder()
        .setTitle("📊 Status Member")
        .addFields(
          { name: "🟢 Online", value: String(statusMap.online), inline: true },
          { name: "🌙 Idle", value: String(statusMap.idle), inline: true },
          { name: "⛔ DND", value: String(statusMap.dnd), inline: true },
          { name: "⚫ Offline", value: String(statusMap.offline), inline: true },
        )
        .setColor("Blue");
      await i.reply({ embeds: [statusEmbed] });
      break;
  }
});

// Web server Railway
const app = express();
app.get("/", (req, res) => res.send("Bot aktif!"));
app.listen(3000, () => console.log("🌐 Web aktif di port 3000"));

setInterval(() => {
  fetch("https://YOUR-REPL-URL.repl.co"); // ganti dengan URL kamu
}, 4 * 60 * 1000);

client.login(TOKEN);
