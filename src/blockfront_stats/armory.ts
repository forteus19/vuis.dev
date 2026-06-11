import { BFAPI_HOST, byId, createAvatarElement, retrieveLastUsername, setLastSearch, type BfApiError, type NamedStub } from "../common";
import { createBreak, createItalic, createRow } from "../dom_util";

type ItemDetails = [name: string, rarity: number, itemType: number, mcIdIndex?: number, skinId?: number, patternIndex?: number];
type McDetails = [id: string, capacity: number, maxAmmo: number];
type Pattern = [name: string, width: number, height: number];

import itemRegistryData from "../assets/registry_items.json";
const itemRegistry = itemRegistryData as unknown as {
	details: Partial<Record<string, ItemDetails>>;
	mc: McDetails[];
	patterns: Pattern[];
};

type PlayerInventory = {
	inventory: ItemStack[];
	player: NamedStub;
};

type ItemStack = {
	id: number;
	mint: number;
	tag?: string;
	command?: string;
};

const RARITIES = ["DEFAULT", "COAL", "IRON", "LAPIS", "GOLD", "DIAMOND", "OBSIDIAN"];
const RARITY_COLORS = ["#878787", "#6890ad", "#1f93e7", "#8b7def", "#cc5fc1", "#e8485c", "#ffc438"];
const ITEM_TYPES = ["ALL", "GENERIC", "BOOSTER", "CARD", "CAPE", "COIN", "GUN", "HAT", "KEY", "MELEE", "ARMOR", "CASE", "STICKER", "NAME TAG"];

let username: string;
let inventory: ItemStack[];
const dupes: Set<number> = new Set();

document.addEventListener("DOMContentLoaded", async () => {
	const playerLink = byId<HTMLAnchorElement>("player-link");
	const statusLink = byId<HTMLAnchorElement>("status-link");

	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const controlsElement = byId<HTMLDivElement>("stat-controls");

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
		username = name;
	}

	titleElement.appendChild(createAvatarElement(uuid));

	playerLink.href = `player.html?uuid=${stats.player.uuid}`;
	playerLink.hidden = false;
	statusLink.href = `status.html?uuid=${stats.player.uuid}`;
	statusLink.hidden = false;

	loadingElement.hidden = true;
	controlsElement.hidden = false;

	inventory = [...stats.inventory];

	let skinCount = 0;
	for (const stack of inventory) {
		const details = itemRegistry.details[stack.id];
		if (!details) {
			continue;
		}

		if (details[1] !== 0 && (details[2] === 6 || details[2] === 9)) {
			skinCount++;
		}

		const command = createGiveCommand(stack, details);
		if (command) {
			stack.command = command;
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
		const details = itemRegistry.details[item.id];

		if (details && (!filter || filter === details[2]) && (showDefaults || details[1] !== 0)) {
			const row = buildItemRow(item, highlightDupes);
			if (row) {
				armoryTable.appendChild(row);
			}
		}
	}
}

function createGiveCommand(stack: ItemStack, details: ItemDetails): string | null {
	const mcIdIndex = details[3];
	if (mcIdIndex === undefined) {
		return null;
	}

	const mcDetails = itemRegistry.mc[mcIdIndex];

	const components: string[] = [`bf:has_tag=1`, `bf:ammo=${mcDetails[2]}`, `bf:max_ammo=${mcDetails[2]}`, `bf:ammo_loaded=${mcDetails[1]}`, `bf:mint=${stack.mint}`];

	if (username) {
		components.push(`bf:original_owner=${username}`);
	}

	if (stack.tag !== undefined) {
		components.push(`bf:name_tag="${stack.tag}"`);
	}

	const skinId = details[4];
	if (skinId) {
		components.push(`bf:skin_id=${skinId.toExponential()}`);
	}

	const patternIndex = details[5];
	if (patternIndex !== undefined) {
		const pattern = itemRegistry.patterns[patternIndex];
		components.push(`bf:has_pattern=1`, `bf:pattern_name=${pattern[0]}`, `bf:pattern_width=${pattern[1]}`, `bf:pattern_height=${pattern[2]}`);
	}

	return `/give @p bf:gun_${mcDetails[0]}[` + components.join(",") + "]";
}

function buildHeaderRow(): HTMLTableRowElement {
	return createRow(
		{ header: true },
		{ contents: "C", width: "20px" },
		{ contents: "Type", width: "85px" },
		{ contents: "Item", width: "320px" },
		{ contents: "Rarity", width: "85px" },
		{ contents: "Mint", width: "85px" },
	);
}

function buildItemRow(stack: ItemStack, highlightDupes: boolean): HTMLTableRowElement | null {
	const details = itemRegistry.details[stack.id];
	if (!details) {
		return null;
	}

	const rarityColor = RARITY_COLORS[details[1]];

	return createRow(
		highlightDupes && dupes.has(stack.id) ? { color: "#471c1c" } : {},
		{ contents: createCommandButton(stack), className: "command-cell", width: "20px" },
		{ contents: ITEM_TYPES[details[2]], width: "85px" },
		{ contents: stack.tag ? [details[0], createBreak(), createItalic(`"${stack.tag}"`)] : details[0], color: rarityColor, width: "320px" },
		{ contents: RARITIES[details[1]].toUpperCase(), color: rarityColor, width: "85px" },
		{ contents: stack.mint.toFixed(6), color: getMintColor(stack.mint), width: "85px" },
	);
}

function createCommandButton(stack: ItemStack): HTMLButtonElement | null {
	const command = stack.command;
	if (!command) {
		return null;
	}

	const button = document.createElement("button");
	button.innerText = "/";
	button.className = "command-button";

	button.addEventListener("click", () => {
		navigator.clipboard.writeText(command);

		let message = "Copied command to clipboard";
		if (command.length > 256) {
			message += " (command block required)";
		}
		alert(message);
	});

	return button;
}

function getRarityComparator(): (a: ItemStack, b: ItemStack) => number {
	return (a, b) => {
		const indexA = itemRegistry.details[a.id]?.[1] ?? -1;
		const indexB = itemRegistry.details[b.id]?.[1] ?? -1;

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
