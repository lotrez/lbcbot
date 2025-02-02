import { EmbedBuilder } from "discord.js";
import { type LbcAd, downloadImage } from "./lbcscraper";

export const formatMessage = async (ad: LbcAd) => {
	const files = await Promise.all(
		ad.images.map(async (img) => await downloadImage(img)),
	);
	const embed = new EmbedBuilder()
		.setColor("#ec5a13")
		.setTitle(ad.title)
		.setURL(ad.url)
		.setAuthor({
			name: ad.seller.name,
		})
		.setDescription(ad.description)
		.setThumbnail(ad.images[0])
		.addFields(
			{ name: "Prix", value: `${ad.price} €`, inline: true },
			{
				name: "Localisation",
				value: `${ad.localization.city} ${ad.localization.zipcode}`,
				inline: true,
			},
		)
		.setTimestamp(new Date(ad.timestamp));
	return { embed, files };
};
