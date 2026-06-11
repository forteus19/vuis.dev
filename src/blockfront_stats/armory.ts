import { BFAPI_HOST, byId, createAvatarElement, retrieveLastUsername, setLastSearch, type BfApiError, type NamedStub } from "../common";
import { createBreak, createItalic, createRow } from "../dom_util";

type ItemRegistryEntry = [
	name: string,
	rarity: number,
	itemType: number
];

import itemRegistryData from "../assets/registry_items.json";
const itemRegistry = itemRegistryData as unknown as Partial<Record<string, ItemRegistryEntry>>;

type PlayerInventory = {
	inventory: ItemStack[];
	player: NamedStub;
};

type ItemStack = {
	id: number;
	mint: number;
	tag?: string;
};

const RARITIES = ["DEFAULT", "COAL", "IRON", "LAPIS", "GOLD", "DIAMOND", "OBSIDIAN"];
const RARITY_COLORS = ["#878787", "#6890ad", "#1f93e7", "#8b7def", "#cc5fc1", "#e8485c", "#ffc438"];
const ITEM_TYPES = ["ALL", "GENERIC", "BOOSTER", "CARD", "CAPE", "COIN", "GUN", "HAT", "KEY", "MELEE", "ARMOR", "CASE", "STICKER", "NAME TAG"];

let inventory: ItemStack[] | null = null;
const dupes: Set<number> = new Set();

document.addEventListener("DOMContentLoaded", async () => {
	const playerLink = byId<HTMLAnchorElement>("player-link");
	const statusLink = byId<HTMLAnchorElement>("status-link");

	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	const urlParams = new URLSearchParams(window.location.search);
	const playerUuid = urlParams.get("uuid");
	if (!playerUuid) {
		titleElement.innerText = "missing uuid!";
		loadingElement.hidden = true;
		return;
	}

	const lastUsername = retrieveLastUsername(playerUuid);
	titleElement.innerText = `Armory for player ${lastUsername ? lastUsername : playerUuid}`;

	const fetchParams = new URLSearchParams({ uuid: playerUuid });

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

	const uuid = stats.player.uuid;
	const name = stats.player.name;

	if (name) {
		setLastSearch({
			uuid: uuid,
			name: name,
		});

		titleElement.innerText = `Armory for player ${name}`;
	}

	titleElement.appendChild(createAvatarElement(uuid));

	playerLink.href = `player.html?uuid=${stats.player.uuid}`;
	playerLink.hidden = false;
	statusLink.href = `status.html?uuid=${stats.player.uuid}`;
	statusLink.hidden = false;

	loadingElement.hidden = true;
	statsElement.hidden = false;

	inventory = [...stats.inventory];

	let skinCount = 0;
	for (const item of inventory) {
		const reg = itemRegistry[item.id];
		if (reg && reg[1] !== 0 && (reg[2] === 6 || reg[2] === 9)) {
			skinCount++;
		}
	}
	const skinCountElement = byId("stat-skins");
	skinCountElement.innerText = `${skinCount}/256`;
	if (skinCount >= 256) {
		skinCountElement.style.color = "#FF5555";
	}

	findDupes();

	byId<HTMLSelectElement>("sort-select").addEventListener("change", () => buildTable(true));
	byId<HTMLSelectElement>("filter-select").addEventListener("change", () => buildTable(false));
	byId<HTMLInputElement>("default-select").addEventListener("change", () => buildTable(false));
	byId<HTMLInputElement>("dupes-select").addEventListener("change", () => buildTable(false));

	buildTable(true);
});

function findDupes() {
	if (!inventory) {
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
	if (!inventory) {
		return;
	}

	if (sort) {
		let itemComparator: (a: ItemStack, b: ItemStack) => number;
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
	const filter = filterSelect.value !== "0" ? parseInt(filterSelect.value) : null;

	const showDefaults = byId<HTMLInputElement>("default-select").checked;

	const highlightDupes = byId<HTMLInputElement>("dupes-select").checked;

	const armoryTable = byId<HTMLTableElement>("stat-armory");

	armoryTable.replaceChildren(buildHeaderRow());
	for (const item of inventory) {
		const reg = itemRegistry[item.id];

		if (reg && (!filter || filter === reg[2]) && (showDefaults || reg[1] !== 0)) {
			const row = buildItemRow(item, highlightDupes);
			if (row) {
				armoryTable.appendChild(row);
			}
		}
	}
}

function buildHeaderRow(): HTMLTableRowElement {
	return createRow({ header: true }, "Type", { contents: "Item", width: "320px" }, "Rarity", "Mint");
}

function buildItemRow(stack: ItemStack, highlightDupes: boolean): HTMLTableRowElement | null {
	const reg = itemRegistry[stack.id];
	if (!reg) {
		return null;
	}

	const rarityColor = RARITY_COLORS[reg[1]];

	return createRow(
		{ color: highlightDupes && dupes.has(stack.id) ? "#471c1c" : undefined },
		ITEM_TYPES[reg[2]],
		{ contents: stack.tag ? [reg[0], createBreak(), createItalic(`"${stack.tag}"`)] : reg[0], color: rarityColor },
		{ contents: RARITIES[reg[1]].toUpperCase(), color: rarityColor },
		{ contents: stack.mint.toFixed(6), color: getMintColor(stack.mint) },
	);
}

function getRarityComparator(): (a: ItemStack, b: ItemStack) => number {
	return (a, b) => {
		const indexA = itemRegistry[a.id]?.[1] ?? -1;
		const indexB = itemRegistry[b.id]?.[1] ?? -1;

		if (indexA !== indexB) {
			return indexB - indexA;
		}

		if (a.id !== b.id) {
			return a.id - b.id;
		}

		return a.mint - b.mint;
	};
}

function getMintComparator(): (a: ItemStack, b: ItemStack) => number {
	return (a, b) => {
		return a.mint - b.mint;
	};
}

function lerp(a: number, b: number, t: number): number {
	return a + t * (b - a);
}

function getColorString(r: number, g: number, b: number): string {
	return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function getMintColor(mint: number): string {
	return getColorString(lerp(0xff, 0x55, mint), lerp(0xe4, 0x55, mint), lerp(0x5b, 0x55, mint));
}
