const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { displayChatTokenCount, streamToStdout } = require("./utils/common.js");

const allowedChannelIds = ["690654777608110161", "1253520252600455329"];

// Get your API key from https://makersuite.google.com/app/apikey
// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const DISCORD_TOKEN = process.env.DISCORD_CLIENT_SECRET;

const chatInstances = {};

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 100,
    },
  });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once("ready", () => {
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

      // console.log((await result.response).text());
      await message.channel.send((await result.response).text());
    } catch (error) {
      console.error("Error generating response:", error);
    }
  });

  client.login(DISCORD_TOKEN);
}

run();
