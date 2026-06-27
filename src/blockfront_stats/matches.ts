import { BFAPI_HOST, byId, createAvatarElement, retrieveLastUsername, setLastSearch, type BfApiError, type NamedStub } from "../common";
import { createOption, createRow } from "../dom_util";

type MatchResult = "win" | "loss" | "draw";

type MatchSummary = {
	match_id: string;
	game: string;
	map: string;
	environment: string;
	ended_at: string;
	duration_seconds: number;
	winner_team: string | null;
	player_team: string | null;
	result: MatchResult;
	placement: number;
	kills: number;
	deaths: number;
	assists: number;
	score: number;
};

type PlayerMatches = {
	matches: MatchSummary[];
	player: NamedStub;
};

const COMPARATORS: ((a: MatchSummary, b: MatchSummary) => number)[] = [
	// time
	(a, b) => compareEndedAt(a, b),
	// kills
	(a, b) => {
		if (a.kills !== b.kills) {
			return b.kills - a.kills;
		}

		return compareEndedAt(a, b);
	},
	// deaths
	(a, b) => {
		if (a.deaths !== b.deaths) {
			return b.deaths - a.deaths;
		}

		return compareEndedAt(a, b);
	},
	// assists
	(a, b) => {
		if (a.assists !== b.assists) {
			return b.assists - a.assists;
		}

		return compareEndedAt(a, b);
	},
	// score
	(a, b) => {
		if (a.score !== b.score) {
			return b.score - a.score;
		}

		return compareEndedAt(a, b);
	},
];

const TIME_UNITS: [string, number][] = [
	["d", 1000 * 60 * 60 * 24],
	["h", 1000 * 60 * 60],
	["m", 1000 * 60],
	["s", 1000],
];

let matches: MatchSummary[];

let gameFilters: string[] = [];
let mapFilters: string[] = [];
let resultFilters: string[] = [];
let teamFilters: string[] = [];

document.addEventListener("DOMContentLoaded", async () => {
	const playerLink = byId<HTMLAnchorElement>("player-link");
	const inventoryLink = byId<HTMLAnchorElement>("inventory-link");

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
	titleElement.innerText = `Matches for player ${lastUsername ?? playerUuid}`;

	const fetchParams = new URLSearchParams({ uuid: playerUuid });

	let stats: PlayerMatches;
	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/player_matches?${fetchParams}`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as PlayerMatches;
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

		titleElement.innerText = `Matches for player ${name}`;
	}

	titleElement.appendChild(createAvatarElement(uuid));

	playerLink.href = `player.html?uuid=${stats.player.uuid}`;
	playerLink.hidden = false;
	inventoryLink.href = `armory.html?uuid=${stats.player.uuid}`;
	inventoryLink.hidden = false;

	loadingElement.hidden = true;
	statsElement.hidden = false;

	matches = [...stats.matches];

	buildFilter(byId<HTMLSelectElement>("game-filter"), (s) => s.game.toUpperCase(), gameFilters);
	buildFilter(byId<HTMLSelectElement>("map-filter"), (s) => s.map, mapFilters);
	buildFilter(byId<HTMLSelectElement>("result-filter"), (s) => s.result.toUpperCase(), resultFilters);
	buildFilter(byId<HTMLSelectElement>("team-filter"), (s) => s.player_team, teamFilters);

	byId<HTMLSelectElement>("sort-select").addEventListener("change", () => buildTable(true));
	byId<HTMLInputElement>("time-select").addEventListener("change", () => buildTable(false));

	buildTable(true);
});

function buildFilter(element: HTMLSelectElement, getter: (summary: MatchSummary) => string | null, entryList: string[]) {
	element.addEventListener("change", () => buildTable(false));

	const visited: Set<string> = new Set();

	for (const summary of matches) {
		const value = getter(summary);

		if (value && !visited.has(value)) {
			visited.add(value);
			entryList.push(value);
		}
	}

	entryList.sort();

	for (const [i, filterEntry] of entryList.entries()) {
		element.appendChild(createOption(i.toString(), filterEntry));
	}
}

function buildTable(sort: boolean) {
	if (!matches) {
		return;
	}

	if (sort) {
		const comparatorIndex = parseInt(byId<HTMLSelectElement>("sort-select").value);
		matches.sort(COMPARATORS[comparatorIndex]);
	}

	const gameFilterValue = byId<HTMLSelectElement>("game-filter").value;
	const gameFilter = gameFilterValue !== "all" ? gameFilters[parseInt(gameFilterValue)].toLowerCase() : null;

	const mapFilterValue = byId<HTMLSelectElement>("map-filter").value;
	const mapFilter = mapFilterValue !== "all" ? mapFilters[parseInt(mapFilterValue)] : null;

	const resultFilterValue = byId<HTMLSelectElement>("result-filter").value;
	const resultFilter = resultFilterValue !== "all" ? resultFilters[parseInt(resultFilterValue)].toLowerCase() : null;

	const teamFilterValue = byId<HTMLSelectElement>("team-filter").value;
	const teamFilter = teamFilterValue !== "all" ? teamFilters[parseInt(teamFilterValue)] : null;

	const absoluteTimes = byId<HTMLInputElement>("time-select").checked;

	const nowMs = Date.now();

	const matchesTable = byId<HTMLTableElement>("stat-matches");

	matchesTable.replaceChildren(buildHeaderRow(absoluteTimes));
	for (const summary of matches) {
		if (
			(!gameFilter || summary.game === gameFilter) &&
			(!mapFilter || summary.map === mapFilter) &&
			(!resultFilter || summary.result === resultFilter) &&
			(!teamFilter || summary.player_team === teamFilter)
		) {
			matchesTable.appendChild(buildEntryRow(summary, absoluteTimes, nowMs));
		}
	}
}

function buildHeaderRow(absoluteTimes: boolean): HTMLTableRowElement {
	return createRow(
		{ header: true },
		{ contents: "Game", width: "50px" },
		{ contents: "Map", width: "150px" },
		{ contents: "Result", width: "70px" },
		{ contents: "Team", width: "70px" },
		{ contents: "Ended", width: absoluteTimes ? "240px" : "100px" },
		{ contents: "Place", width: "70px" },
		{ contents: "Kills", width: "70px" },
		{ contents: "Deaths", width: "70px" },
		{ contents: "Assists", width: "70px" },
		{ contents: "Score", width: "70px" },
	);
}

function buildEntryRow(summary: MatchSummary, absoluteTimes: boolean, nowMs: number): HTMLTableRowElement {
	const endedAt = new Date(summary.ended_at);

	const showStats = summary.game !== "inf";

	return createRow(
		{},
		{ contents: summary.game.toUpperCase(), width: "50px" },
		{ contents: summary.map, width: "150px" },
		{ contents: summary.result.toUpperCase(), color: getResultColor(summary.result), width: "70px" },
		{ contents: summary.player_team, color: getTeamColor(summary.player_team), width: "70px" },
		{ contents: absoluteTimes ? endedAt.toLocaleString() : formatDateRelative(nowMs, endedAt), width: absoluteTimes ? "240px" : "100px" },
		{ contents: `#${summary.placement}`, width: "70px" },
		{ contents: showStats ? summary.kills.toLocaleString() : null, color: "#5FB7F5", width: "70px" },
		{ contents: showStats ? summary.deaths.toLocaleString() : null, color: "#E57373", width: "70px" },
		{ contents: showStats ? summary.assists.toLocaleString() : null, color: "#F5C84F", width: "70px" },
		{ contents: summary.score.toLocaleString(), color: "#7FCA7F", width: "70px" },
	);
}

function compareEndedAt(a: MatchSummary, b: MatchSummary): number {
	return new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime();
}

function getResultColor(result: MatchResult): string {
	switch (result) {
		case "win":
			return "#55FF55";
		case "loss":
			return "#FF5555";
		case "draw":
			return "#FFFF55";
	}
}

function getTeamColor(team: string | null): string | undefined {
	switch (team) {
		case "Allies":
			return "#b8bf6b";
		case "Axis":
			return "#c9584e";
		case "Survivors":
			return "#947ee5";
		default:
			return undefined;
	}
}

function formatDateRelative(nowMs: number, date: Date): string {
	const diffMs = nowMs - date.getTime();

	for (const [unit, ms] of TIME_UNITS) {
		const value = Math.floor(diffMs / ms);
		if (value >= 1) {
			return `${value}${unit} ago`;
		}
	}

	return "Just now";
}
