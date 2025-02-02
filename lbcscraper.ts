import { JSDOM } from "jsdom";
import { parse } from "path";

// Common browser headers to mimic a real browser request
const browserHeaders = {
	Accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.5",
	Connection: "keep-alive",
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Upgrade-Insecure-Requests": "1",
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "none",
	"Sec-Fetch-User": "?1",
	"Cache-Control": "max-age=0",
};

export interface LbcAd {
	images: string[];
	title: string;
	price: number;
	description: string;
	localization: {
		city: string;
		zipcode: string;
		lat: number;
		lng: number;
	};
	seller: {
		name: string;
	};
	url: string;
	timestamp: Date;
}

export const parseLbcAd = async (url: string): Promise<LbcAd> => {
	console.log(`Scraping ${url}`);
	const document = await fetchAndParsePage(url);
	await writeDebug(
		JSON.parse(document.getElementById("__NEXT_DATA__")?.textContent ?? "{}"),
	);
	const nextDataContent = document.getElementById("__NEXT_DATA__")?.textContent;
	if (!nextDataContent) throw new Error("Empty next data");
	const nextData = JSON.parse(nextDataContent);
	return {
		description: nextData.props.pageProps.ad.body,
		images: nextData.props.pageProps.ad.images.urls_large,
		localization: {
			city: nextData.props.pageProps.ad.location.city,
			zipcode: nextData.props.pageProps.ad.location.zipcode,
			lat: nextData.props.pageProps.ad.location.lat,
			lng: nextData.props.pageProps.ad.location.lng,
		},
		price: nextData.props.pageProps.ad.price[0],
		seller: {
			name: nextData.props.pageProps.ad.owner.name,
		},
		title: nextData.props.pageProps.ad.subject,
		url,
		timestamp: new Date(nextData.props.pageProps.ad.first_publication_date),
	};
};

export const fetchAndParsePage = async (url: string) => {
	console.log(`Fetching ${url}`);
	const response = await fetch(url, {
		headers: browserHeaders,
		// Adding common fetch options
		credentials: "same-origin",
		redirect: "follow",
	});
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const html = await response.text();
	const dom = new JSDOM(html);
	return dom.window.document;
};

const writeDebug = async (content: unknown) =>
	await Bun.write("./debug.json", JSON.stringify(content, null, 2));

const IMAGES_PATH = "./lbc-ads-images/" as const;

export const downloadImage = async (url: string) => {
	console.log(`Fetching image ${url}`);
	const response = await fetch(url, {
		headers: browserHeaders,
		// Adding common fetch options
		credentials: "same-origin",
		redirect: "follow",
	});
	if (!response.ok) {
		console.log(await response.text());
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const imagePath = IMAGES_PATH + getFileName(url);
	Bun.write(imagePath, await response.arrayBuffer());
	return imagePath;
};

export const getFileName = (imageUrl: string) => {
	try {
		// Parse the URL
		const url = new URL(imageUrl);

		// Get the pathname and remove query parameters
		const { name, ext } = parse(url.pathname);

		// Clean the filename:
		// 1. Remove special characters and spaces
		// 2. Convert to lowercase
		// 3. Replace multiple dashes with single dash
		// 4. Limit length to avoid too long filenames
		const cleanName = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 50);

		// If no extension in original, try to get it from query params
		let extension = ext.toLowerCase();
		if (!extension && url.searchParams.has("format")) {
			extension = `.${url.searchParams.get("format")?.toLowerCase()}`;
		}

		// If still no extension, default to .jpg
		if (!extension) {
			extension = ".jpg";
		}

		// Add timestamp to ensure uniqueness
		const timestamp = Date.now();

		// Combine everything
		return `${cleanName}-${timestamp}${extension}`;
	} catch (error) {
		// If URL parsing fails, create a fallback filename
		return `image-${Date.now()}.jpg`;
	}
};

export const clearImages = async (paths: string[]) => {
	for (const path of paths) {
		const file = Bun.file(path);
		await file.delete();
	}
};
