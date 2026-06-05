import { BFAPI_HOST, byId, intToHexColor, PRESTIGE_EXP, retrieveLastUsername, setLastSearch, type BfApiError } from "../common";
import { createRow } from "../dom_util";

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
	sb: {
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

let classExpToggled = false;

document.addEventListener("DOMContentLoaded", async () => {
	const statusLink = byId<HTMLAnchorElement>("status-link");
	const inventoryLink = byId<HTMLAnchorElement>("inventory-link");
	const clanLink = byId<HTMLAnchorElement>("clan-link");

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
	titleElement.innerText = `Stats for player ${lastUsername ? lastUsername : playerUuid}`;

	const fetchParams = new URLSearchParams({ uuid: playerUuid });

	let stats: PlayerStats;
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
		loadingElement.innerText = "user not found";
		return;
	}

	setLastSearch({
		uuid: stats.uuid,
		name: stats.username,
	});

	statusLink.href = `status.html?uuid=${stats.uuid}`;
	statusLink.hidden = false;
	inventoryLink.href = `armory.html?uuid=${stats.uuid}`;
	inventoryLink.hidden = false;
	if (stats.clan !== null) {
		clanLink.href = `clan.html?uuid=${stats.clan}`;
		clanLink.hidden = false;
	}

	titleElement.innerText = `Stats for player ${stats.username}`;

	loadingElement.hidden = true;
	statsElement.hidden = false;

	if (stats.punishments.active.ban) {
		byId("banned-message").hidden = false;
	}

	const rankIndex = getRankIndex(stats.exp);

	if (stats.prestige !== 0) {
		byId("stat-prestige").innerText = `P${stats["prestige"]} `;
	}
	byId<HTMLImageElement>("stat-rank-icon").src = RANK_IMAGES[rankIndex];
	byId("stat-rank").innerText = stats.rank;
	byId("stat-progress-current").innerText = (stats.exp - RANK_THRESHOLDS[rankIndex]).toLocaleString();
	byId("stat-progress-end").innerText = (rankIndex !== RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[rankIndex + 1] - RANK_THRESHOLDS[rankIndex] : 0).toLocaleString();

	byId("stat-mood").innerText = stats.mood ? `"${stats.mood}"` : "None";
	const groupElement = byId("stat-group");
	if (stats.group) {
		groupElement.innerText = stats.group.tag;
		groupElement.style.color = intToHexColor(stats.group.color);
	} else {
		groupElement.innerText = "None";
		groupElement.style.color = "darkgray";
	}

	byId("stat-matchkarma").innerText = stats.match_karma.toLocaleString();
	byId("stat-timeplayed").innerText = `${(stats.time_played / 3600).toFixed(1)}h`;
	byId("stat-games").innerText = stats.total_games.toLocaleString();
	byId("stat-trophies").innerText = stats.trophies.toLocaleString();
	const achievementsElement = byId("stat-achievements");
	achievementsElement.innerText = stats.achievements.toLocaleString();
	achievementsElement.style.color = stats.achievements >= 68 ? "lime" : "yellow";

	byId("stat-exp").innerText = stats.exp.toLocaleString();
	byId("stat-expcumulative").innerText = (stats.prestige * PRESTIGE_EXP + stats.exp).toLocaleString();
	if (stats.ucd.exp_rank) {
		byId("stat-exprank").innerText = ` #${stats.ucd.exp_rank}`;
	}
	byId("stat-kd").innerText = (stats.kills / stats.deaths).toFixed(2);
	byId("stat-headshots").innerText = stats.head_shots.toLocaleString();
	byId("stat-khs").innerText = (stats.head_shots / stats.kills).toFixed(2);
	byId("stat-kills").innerText = stats.kills.toLocaleString();
	const sbScoreElement = byId("stat-sb-score");
	if (stats.sb) {
		sbScoreElement.innerText = stats.sb.score.toLocaleString();
		sbScoreElement.style.color = "lime";
		byId("stat-sb-rank").innerText = ` #${stats.sb.rank}`;
	} else {
		sbScoreElement.innerText = "n/a";
		sbScoreElement.style.color = "darkgray";
	}
	byId("stat-killstreak").innerText = stats.highest_kill_streak.toLocaleString();
	byId("stat-firekills").innerText = stats.fire_kills.toLocaleString();
	byId("stat-backstabs").innerText = stats.back_stabs.toLocaleString();
	byId("stat-assists").innerText = stats.assists.toLocaleString();
	byId("stat-noscopes").innerText = stats.no_scopes.toLocaleString();
	byId("stat-deaths").innerText = stats.deaths.toLocaleString();
	byId("stat-deathstreak").innerText = stats.highest_death_streak.toLocaleString();
	byId("stat-firstbloods").innerText = stats.first_bloods.toLocaleString();
	byId("stat-prestigelevel").innerText = stats.prestige.toLocaleString();
	byId("stat-completedbootcamp").innerText = stats.bootcamp ? "Yes" : "No";

	byId("stat-infectedroundswon").innerText = stats.infected_rounds_won.toLocaleString();
	byId("stat-infectedmatcheswon").innerText = stats.infected_matches_won.toLocaleString();

	byId("stat-botkills").innerText = stats.bot_kills.toLocaleString();
	byId("stat-infectedkills").innerText = stats.infected_kills.toLocaleString();
	byId("stat-vehiclekills").innerText = stats.vehicle_kills.toLocaleString();

	const classExpTable = byId<HTMLTableElement>("stat-cexp");
	buildClassExpTable(classExpTable, stats.class_exp);

	byId<HTMLButtonElement>("stat-cexp-toggle").addEventListener("click", function () {
		classExpToggled = !classExpToggled;

		classExpTable.hidden = !classExpToggled;
		this.innerText = `${classExpToggled ? "Hide" : "Show"} Class EXP`;
	});
});

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
