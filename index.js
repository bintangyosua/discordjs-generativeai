const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Embed,
  PresenceUpdateStatus,
  ActivityType,
} = require("discord.js");
const { displayChatTokenCount, streamToStdout } = require("./utils/common.js");
const { EmbedBuilder } = require("discord.js");

const allowedChannelIds = [
  "690654777608110161",
  "1253520252600455329",
  "1253590960575877120",
];

// Get your API key from https://makersuite.google.com/app/apikey
// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const DISCORD_TOKEN = process.env.DISCORD_CLIENT_SECRET;

const chatInstances = {};

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once("ready", () => {
    client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
    client.user.setActivity({
      name: "Chatting with You",
      type: ActivityType.Playing,
    });
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (!allowedChannelIds.includes(message.channel.id)) return;

    try {
      if (!chatInstances[message.channel.id]) {
        chatInstances[message.channel.id] = model.startChat({
          history: [],
          generationConfig: {
            maxOutputTokens: 200,
          },
        });
      }

      const chat = chatInstances[message.channel.id];

      const result = await chat.sendMessageStream(message.content);

      displayChatTokenCount(model, chat, message.content);
      await streamToStdout(result.stream);

      const embed = new EmbedBuilder()
        .setDescription((await result.response).text())
        .setColor(0x845a5e)
        .setFooter({
          iconURL:
            "https://cdn.discordapp.com/avatars/1138809326572679318/2de4f74ca51ac4642550fc7195e8d9b4.png",
          text: "SPEAKABLE YOUTH",
        });

      // console.log((await result.response).text());
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Error generating response:", error);
      console.log(error.rawError.errors);
    }
  });

  client.login(DISCORD_TOKEN);
}

run();
