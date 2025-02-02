import { formatDistance } from "date-fns";
import { EmbedBuilder } from "discord.js";
import { type LbcAd, downloadImage } from "./lbcscraper";

export const formatMessage = async (ad: LbcAd) => {
	const files = await Promise.all(
		ad.images.map(async (img) => await downloadImage(img)),
	);
	const timeToDestination = (await getRouteToDestination(ad))?.trip?.summary
		?.time;
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
				value: `${ad.localization.city} ${ad.localization.zipcode}, temps de route depuis Angers : ${timeToDestination ? formatDistance(0, timeToDestination * 1000, { includeSeconds: true }) : "N/A"}`,
				inline: true,
			},
		)
		.setTimestamp(new Date(ad.timestamp));
	return { embed, files };
};

const getRouteToDestination = async (
	ad: LbcAd,
): Promise<RouteResponse | null> => {
	const API_KEY = process.env.STADIA_MAPS_KEY;
	if (!API_KEY) throw Error("No stadia maps api key");
	const raw = JSON.stringify({
		locations: [
			{
				lon: "-0.55",
				lat: "47.4667",
				type: "break",
			},
			{
				lon: ad.localization.lng,
				lat: ad.localization.lat,
				type: "break",
			},
		],
		costing: "auto",
		costing_options: {
			auto: {
				use_highways: 0.3,
			},
		},
		units: "km",
	});
	const myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");
	try {
		const response = await fetch(
			`https://api.stadiamaps.com/route/v1?api_key=${API_KEY}`,
			{
				method: "POST",
				headers: myHeaders,
				body: raw,
				redirect: "follow",
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			console.error("API Error:", errorData);
			throw new Error(`API request failed: ${JSON.stringify(errorData)}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching route:", error);
		return null;
	}
};

export interface RouteResponse {
	trip: Trip;
}

interface Trip {
	locations: Location[];
	legs: Leg[];
	summary: Summary;
	status_message: string;
	status: number;
	units: string;
	language: string;
}

interface Leg {
	maneuvers: Maneuver[];
	summary: Summary;
	shape: string;
}

interface Summary {
	has_time_restrictions: boolean;
	has_toll: boolean;
	has_highway: boolean;
	has_ferry: boolean;
	min_lat: number;
	min_lon: number;
	max_lat: number;
	max_lon: number;
	time: number;
	length: number;
	cost: number;
}

interface Maneuver {
	type: number;
	instruction: string;
	verbal_succinct_transition_instruction?: string;
	verbal_pre_transition_instruction: string;
	verbal_post_transition_instruction?: string;
	street_names?: string[];
	time: number;
	length: number;
	cost: number;
	begin_shape_index: number;
	end_shape_index: number;
	verbal_multi_cue?: boolean;
	travel_mode: string;
	travel_type: string;
	verbal_transition_alert_instruction?: string;
	begin_street_names?: string[];
}

interface Location {
	type: string;
	lat: number;
	lon: number;
	side_of_street: string;
	original_index: number;
}
