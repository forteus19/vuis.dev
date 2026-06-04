import { BFAPI_HOST, byId, retrieveLastUsername, setLastSearch, type BfApiError, type PlayerStub } from "../common";
import { createBreak, createItalic, createRow } from "../dom_util";

type PlayerInventory = {
	inventory: Item[];
	player: PlayerStub;
};

type Item = {
	id: number;
	display_name: string;
	rarity: Rarity;
	type: ItemType;
	mint: number;
	name_tag?: string;
};

type Rarity = "default" | "coal" | "iron" | "lapis" | "gold" | "diamond" | "obsidian";
type ItemType = "all" | "generic" | "booster" | "card" | "cape" | "coin" | "gun" | "hat" | "key" | "melee" | "armor" | "case" | "sticker" | "name_tag";

const RARITY_COLORS = ["#8c8e93", "#6890ad", "#1f93e7", "#8b7def", "#cc5fc1", "#e8485c", "#ffc438"];

let inventory: Item[] | null = null;
const dupes: Set<number> = new Set();

document.addEventListener("DOMContentLoaded", async () => {
	const playerLink = byId<HTMLAnchorElement>("player-link");
	const statusLink = byId<HTMLAnchorElement>("status-link");

	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	const urlParams = new URLSearchParams(window.location.search);
	const playerUuid = urlParams.get("uuid");
	if (playerUuid === null) {
		titleElement.innerText = "missing uuid!";
		loadingElement.hidden = true;
		return;
	}

	const lastUsername = retrieveLastUsername(playerUuid);
	titleElement.innerText = `Armory for player ${lastUsername !== null ? lastUsername : playerUuid}`;

	const fetchParams = new URLSearchParams({ uuid: playerUuid, include_details: "true" });

	let stats: PlayerInventory;
	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/player_inventory?${fetchParams}`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as PlayerInventory;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	if (stats.player.name !== "Unknown") {
		setLastSearch({
			uuid: stats.player.uuid,
			name: stats.player.name,
		});
		titleElement.innerText = `Armory for player ${stats.player.name}`;
	}

	playerLink.href = `player.html?uuid=${stats.player.uuid}`;
	playerLink.hidden = false;
	statusLink.href = `status.html?uuid=${stats.player.uuid}`;
	statusLink.hidden = false;

	loadingElement.hidden = true;
	statsElement.hidden = false;

	inventory = [...stats.inventory];

	let skinCount = 0;
	for (const item of inventory) {
		if (item.type === "gun" || item.type === "melee") {
			skinCount++;
		}
	}
	const skinCountElement = byId("stat-skins");
	skinCountElement.innerText = `${skinCount}/256`;
	if (skinCount >= 256) {
		skinCountElement.style.color = "red";
	}

	findDupes();

	byId<HTMLSelectElement>("sort-select").addEventListener("change", () => buildTable(true));
	byId<HTMLSelectElement>("filter-select").addEventListener("change", () => buildTable(false));
	byId<HTMLInputElement>("dupes-select").addEventListener("change", () => buildTable(false));

	buildTable(true);
});

function findDupes() {
	if (inventory === null) {
		return;
	}

	const visitedIds: Set<number> = new Set();

	for (const item of inventory) {
		if (visitedIds.has(item.id)) {
			dupes.add(item.id);
		} else {
			visitedIds.add(item.id);
		}
	}
}

function buildTable(sort: boolean) {
	if (inventory === null) {
		return;
	}

	if (sort) {
		let itemComparator: (a: Item, b: Item) => number;
		switch (byId<HTMLSelectElement>("sort-select").value) {
			default:
				itemComparator = getRarityComparator();
				break;
			case "mint":
				itemComparator = getMintComparator();
				break;
		}
		inventory.sort(itemComparator);
	}

	const filterSelect = byId<HTMLSelectElement>("filter-select");
	const filter = filterSelect.value === "all" ? null : filterSelect.value;

	const highlightDupes = byId<HTMLInputElement>("dupes-select").checked;

	const armoryTable = byId<HTMLTableElement>("stat-armory");

	armoryTable.replaceChildren(buildHeaderRow());
	for (const item of inventory) {
		if (filter === null || filter === item.type) {
			armoryTable.appendChild(buildItemRow(item, highlightDupes));
		}
	}
}

function buildHeaderRow(): HTMLTableRowElement {
	return createRow({ header: true }, "Type", { contents: "Item", width: "320px" }, "Rarity", "Mint");
}

function buildItemRow(item: Item, highlightDupes: boolean): HTMLTableRowElement {
	const rarityColor = RARITY_COLORS[getRarityIndex(item.rarity)];

	return createRow(
		{ color: highlightDupes && dupes.has(item.id) ? "#471c1c" : undefined },
		item.type.replaceAll("_", " ").toUpperCase(),
		{ contents: item.name_tag !== undefined ? [item.display_name, createBreak(), createItalic(`"${item.name_tag}"`)] : item.display_name, color: rarityColor },
		{ contents: item.rarity.toUpperCase(), color: rarityColor },
		{ contents: item.mint.toFixed(6), color: getMintColor(item.mint) },
	);
}

function getRarityIndex(rarity: Rarity): number {
	switch (rarity) {
		default:
			return 0;
		case "coal":
			return 1;
		case "iron":
			return 2;
		case "lapis":
			return 3;
		case "gold":
			return 4;
		case "diamond":
			return 5;
		case "obsidian":
			return 6;
	}
}

function getRarityComparator(): (a: Item, b: Item) => number {
	return (a, b) => {
		const indexA = getRarityIndex(a.rarity);
		const indexB = getRarityIndex(b.rarity);

		if (indexA !== indexB) {
			return indexB - indexA;
		}

		if (a.id !== b.id) {
			return a.id - b.id;
		}

		return a.mint - b.mint;
	};
}

function getMintComparator(): (a: Item, b: Item) => number {
	return (a, b) => {
		return a.mint - b.mint;
	};
}

function lerp(a: number, b: number, t: number): number {
	return a + t * (b - a);
}

function getColorString(r: number, g: number, b: number): string {
	return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function getMintColor(mint: number): string {
	return getColorString(lerp(0xff, 0x55, mint), lerp(0xe4, 0x55, mint), lerp(0x5b, 0x55, mint));
}
