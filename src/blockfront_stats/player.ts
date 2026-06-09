import { BFAPI_HOST, byId, createAvatarElement, intToHexColor, PRESTIGE_EXP, retrieveLastUsername, setLastSearch, type BfApiError } from "../common";
import { createImage, createRow, createSpan } from "../dom_util";

const RANK_IMAGES = Object.entries(import.meta.glob("../assets/bf_ranks/*.png", { eager: true, query: "?url", import: "default" }))
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url) as string[];

type PlayerStats = {
	uuid: string;
	username: string;
	mood: string | null;
	class_exp: ClassExpEntry[];
	exp: number;
	rank: string;
	trophies: number;
	prestige: number;
	match_karma: number;
	total_games: number;
	time_played: number;
	bootcamp: boolean;
	clan: string | null;
	cases_opened: number;
	kills: number;
	assists: number;
	infected_kills: number;
	vehicle_kills: number;
	bot_kills: number;
	deaths: number;
	back_stabs: number;
	head_shots: number;
	no_scopes: number;
	first_bloods: number;
	fire_kills: number;
	highest_kill_streak: number;
	highest_death_streak: number;
	infected_rounds_won: number;
	infected_matches_won: number;
	achievements: number;
	group: {
		tag: string;
		color: number;
	} | null;
	max_friends: number;
	punishments: {
		past: Punishments;
		active: Punishments;
	};
	linked_discord: boolean;
	linked_patreon: boolean;
	sb?: {
		rank: number;
		score: number;
	} | null;
	ucd: {
		exp_rank: number | null;
	};
};

type ClassExpEntry = {
	id: number;
	exp: number;
};

type Punishments = {
	warning?: number;
	mute?: number;
	ban?: number;
};

const RANK_THRESHOLDS = [0, 1, 1_001, 3_001, 6_001, 10_001, 16_001, 23_501, 32_501, 43_001, 55_001, 69_001, 85_001, 103_001, 123_001, 145_001, 169_001, 195_001, 223_001, 253_001];

const CLASS_NAMES = ["Rifleman", "Lt. Rifle", "Assault", "Support", "Medic", "Sniper", "Gunner", "Anti-Tank", "Specialist", "Commander"];

let stats: PlayerStats | null = null;

document.addEventListener("DOMContentLoaded", async () => {
	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");

	const urlParams = new URLSearchParams(window.location.search);
	const playerUuid = urlParams.get("uuid");
	if (!playerUuid) {
		titleElement.innerText = "missing uuid!";
		loadingElement.hidden = true;
		return;
	}

	const lastUsername = retrieveLastUsername(playerUuid);
	titleElement.innerText = `Stats for player ${lastUsername ? lastUsername : playerUuid}`;

	const fetchParams = new URLSearchParams({ uuid: playerUuid });

	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/player_data?${fetchParams}`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as PlayerStats;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	if (stats.username === "Unknown") {
		loadingElement.innerText = "unknown user";

		const showButton = byId<HTMLButtonElement>("show-button");
		showButton.hidden = false;

		showButton.addEventListener("click", () => {
			showButton.hidden = true;
			load();
		});

		return;
	}

	load();
});

function load() {
	if (!stats) {
		return;
	}

	const statusLink = byId<HTMLAnchorElement>("status-link");
	const inventoryLink = byId<HTMLAnchorElement>("inventory-link");
	const clanLink = byId<HTMLAnchorElement>("clan-link");

	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	setLastSearch({
		uuid: stats.uuid,
		name: stats.username,
	});

	statusLink.href = `status.html?uuid=${stats.uuid}`;
	statusLink.hidden = false;
	inventoryLink.href = `armory.html?uuid=${stats.uuid}`;
	inventoryLink.hidden = false;
	if (stats.clan) {
		clanLink.href = `clan.html?uuid=${stats.clan}`;
		clanLink.hidden = false;
	}

	titleElement.innerText = `Stats for player ${stats.username}`;
	titleElement.appendChild(createAvatarElement(stats.uuid));

	loadingElement.hidden = true;
	statsElement.hidden = false;

	if (stats.punishments.active.ban) {
		byId("banned-message").hidden = false;
	}

	if (stats.sb) {
		byId("scoreboard-message").hidden = false;
	}

	const rankIndex = getRankIndex(stats.exp);

	const rankElement = byId("stat-rank");
	if (stats.prestige) {
		rankElement.appendChild(createSpan(`P${stats.prestige}`, "#92FF7A"));
	}
	rankElement.append(createSpan(stats.rank, "white"), createImage(RANK_IMAGES[rankIndex]));
	setStat("progress-current", stats.exp - RANK_THRESHOLDS[rankIndex]);
	setStat("progress-end", rankIndex !== RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[rankIndex + 1] - RANK_THRESHOLDS[rankIndex] : 0);

	setStat("mood", stats.mood ? `"${stats.mood}"` : "None");
	setStat("group", stats.group ? stats.group.tag : "None", stats.group ? intToHexColor(stats.group.color) : "#AAAAAA");

	setStat("matchkarma", stats.match_karma);
	setStat("timeplayed", `${(stats.time_played / 3600).toFixed(1)}h`);
	setStat("games", stats.total_games);
	setStat("trophies", stats.trophies);
	setStat("achievements", stats.achievements, stats.achievements >= 68 ? "#55FF55" : "#FFFF55");

	setStat("exp", stats.exp);
	setStat("expcumulative", stats.prestige * PRESTIGE_EXP + stats.exp);
	if (stats.ucd.exp_rank) {
		setStat("exprank", ` #${stats.ucd.exp_rank}`);
	}
	setRatio("kd", stats.kills, stats.deaths);
	setStat("headshots", stats.head_shots);
	setRatio("khs", stats.head_shots, stats.kills);
	setStat("kills", stats.kills);
	if (stats.sb) {
		setStat("sb-score", stats.sb.score, "#55FF55");
		setStat("sb-rank", ` #${stats.sb.rank}`);
	} else {
		setStat("sb-score", "n/a", "#AAAAAA");
	}
	setStat("killstreak", stats.highest_kill_streak);
	setStat("firekills", stats.fire_kills);
	setStat("backstabs", stats.back_stabs);
	setStat("assists", stats.assists);
	setStat("noscopes", stats.no_scopes);
	setStat("deaths", stats.deaths);
	setStat("deathstreak", stats.highest_death_streak);
	setStat("firstbloods", stats.first_bloods);
	setStat("prestigelevel", stats.prestige);
	setStat("completedbootcamp", stats.bootcamp ? "Yes" : "No", stats.bootcamp ? "#55FF55" : "#FF5555");

	setStat("infectedroundswon", stats.infected_rounds_won);
	setStat("infectedmatcheswon", stats.infected_matches_won);

	setStat("botkills", stats.bot_kills);
	setStat("infectedkills", stats.infected_kills);
	setStat("vehiclekills", stats.vehicle_kills);

	const pastPunishments = stats.punishments.past;
	const activePunishments = stats.punishments.active;
	for (const field of ["warning", "mute", "ban"] as const) {
		setStat(field, pastPunishments[field] ?? 0);
		const active = activePunishments[field];
		if (active) {
			byId(`stat-${field}-active`).hidden = false;
			setStat(field + "-count", active);
		}
	}

	buildClassExpTable(byId<HTMLTableElement>("stat-cexp"), stats.class_exp);
}

function setStat(statName: string, stat: string | number, color?: string) {
	const element = byId(`stat-${statName}`);
	element.innerText = typeof stat === "number" ? stat.toLocaleString() : stat;
	if (color) {
		element.style.color = color;
	}
}

function setRatio(statName: string, num: number, den: number) {
	const ratio = num / den;
	setStat(statName, ratio ? ratio.toFixed(2) : "n/a", ratio ? (ratio > 1 ? "#55FF55" : "#FF5555") : "#AAAAAA");
}

function getRankIndex(exp: number): number {
	let index = -1;
	for (const threshold of RANK_THRESHOLDS) {
		if (exp < threshold) {
			break;
		} else {
			index++;
		}
	}
	return index;
}

function buildClassExpTable(table: HTMLTableElement, entries: ClassExpEntry[]) {
	const sortedEntries = [...entries].sort((a, b) => a.id - b.id);

	table.replaceChildren(createRow({ header: true }, "Class", "EXP"));

	for (const entry of sortedEntries) {
		if (entry.id < 0 || entry.id >= CLASS_NAMES.length) {
			console.error("unknown class id: %d", entry.id);
			continue;
		}

		table.appendChild(createRow({}, CLASS_NAMES[entry.id], entry.exp.toLocaleString()));
	}
}
