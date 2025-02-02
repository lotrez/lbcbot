import { Client, GatewayIntentBits, Partials } from "discord.js";
import { clearImages, parseLbcAd } from "./lbcscraper";
import { formatMessage } from "./message-formatter";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID)
	throw Error("Missing client id or token");

const client = new Client({
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
	],
	partials: [Partials.Message],
});

client.on("ready", () => {
	console.log(`Logged in as ${client?.user?.tag}!`);
});

client.on("messageCreate", async (message) => {
	// check if the sender is not itself
	if (message.author.bot) return;
	// is there the leboncoin url inside the content
	const isLBC = message.content.includes("https://www.leboncoin.fr/");
	if (isLBC) {
		const urls = [
			...message.content.matchAll(
				/(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/gim,
			),
		];
		const lbcAds = await Promise.all(
			urls.map(async (url) => await parseLbcAd(url.toString())),
		);
		const formattedMessages = await Promise.all(
			lbcAds.map(async (ad) => await formatMessage(ad)),
		);
		for (const formattedMessage of formattedMessages) {
			await message.reply({
				embeds: [formattedMessage.embed],
				files: formattedMessage.files,
			});
			await clearImages(formattedMessage.files);
		}
	}
});

client.login(DISCORD_TOKEN);
