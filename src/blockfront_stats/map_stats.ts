import { byId, CLOUD_API_HOST, getGameTypeIndex, getGameTypeName, type GameType } from "../common";
import { createBold, createBreak, createH3, createSeparator } from "../dom_util";

type MapStatsResponse = {
	generatedAt: number;
	maps: MapStats[];
};

type MapStats = {
	map: string;
	modes: ModeStats[];
};

type ModeStats = {
	map: string;
	mode: GameType;
	matches: number;
	teams: Record<string, TeamStats>;
};

type TeamStats = {
	matches: number;
	wins: number;
	winRate: number;
	kills: number;
	deaths: number;
	kd: number;
	score: number;
};

let maps: MapStats[];

document.addEventListener("DOMContentLoaded", async () => {
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	let stats: MapStatsResponse;
	try {
		const response = await fetch(`${CLOUD_API_HOST}/api/v2/?type=map_stats`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = "unknown error";
			return;
		}

		stats = json as MapStatsResponse;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	loadingElement.hidden = true;
	statsElement.hidden = false;

	maps = stats.maps.toSorted((a, b) => a.map.localeCompare(b.map));

	for (const map of maps) {
		map.modes.sort((a, b) => getGameTypeIndex(a.mode) - getGameTypeIndex(b.mode));

		statsElement.appendChild(createMapStatsElement(map));
	}
});

function createMapStatsElement(stats: MapStats): HTMLElement {
	const root = document.createElement("p");

	root.append(
		createSeparator(),
		createH3(stats.map)
	);

	for (const mode of stats.modes) {
		root.appendChild(createModeStatsElement(mode));
	}

	return root;
}

function createModeStatsElement(stats: ModeStats): HTMLElement {
	const root = document.createElement("p");

	root.append(
		createBold(getGameTypeName(stats.mode)), createBreak(),
		`Matches: ${stats.matches}`,
	);

	if (stats.mode !== "ffa") {
		root.append(
			createBreak(),
			createWinRateBar(stats)
		)
	}

	return root;
}

function createWinRateBar(stats: ModeStats): HTMLElement {
	const winRateBar = document.createElement("div");
	winRateBar.style.display = "flex";
	winRateBar.style.width = "300px";
	winRateBar.style.height = "15px";
	winRateBar.style.border = "1px solid #555";

	let remainingWins = stats.matches;

	for (const [teamName, teamStats] of Object.entries(stats.teams)) {
		if (teamStats.wins <= 0) {
			continue;
		}

		winRateBar.appendChild(createWinRateSection(teamName, getTeamColor(teamName) ?? "#505050", teamStats));

		remainingWins -= teamStats.wins;
	}

	if (remainingWins > 0) {
		const isDraw = stats.mode !== "inf";

		winRateBar.appendChild(createWinRateSection(
			isDraw ? "Draw" : "Defeat",
			isDraw ? "#777" : "#303030",
			remainingWins
		));
	}

	return winRateBar;
}

function createWinRateSection(name: string, color: string, stats: TeamStats | number): HTMLDivElement {
	const amount = typeof stats === "number" ? stats : stats.wins;

	const winRateTeam = document.createElement("div");
	winRateTeam.className = "tooltip-parent";
	winRateTeam.style.position = "relative";
	winRateTeam.style.flex = amount.toString();
	winRateTeam.style.backgroundColor = color;

	const tooltip = document.createElement("span");
	tooltip.className = "tooltip";

	tooltip.appendChild(createBold(`${name} (${amount})`));
	if (typeof stats === "object") {
		tooltip.append(
			createBreak(),
			`Kills: ${stats.kills.toLocaleString()}`, createBreak(),
			`Deaths: ${stats.deaths.toLocaleString()}`, createBreak(),
			`K/D: ${stats.kd.toFixed(2)}`, createBreak(),
			`Score: ${stats.score.toLocaleString()}`
		);
	}

	winRateTeam.appendChild(tooltip);

	return winRateTeam;
}

function getTeamColor(team: string | null): string | undefined {
	switch (team) {
		case "Allies":
			return "#7a7f47";
		case "Axis":
			return "#7f3831";
		case "Survivors":
			return "#635499";
		default:
			return undefined;
	}
}
