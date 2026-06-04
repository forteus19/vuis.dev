import { BFAPI_HOST, byId, getGameTypeName, type BfApiError, type GameType } from "../common";
import { createAnchor, createRow } from "../dom_util";

type CloudStats = {
	players_online: number;
	game_player_count: Partial<Record<GameType, number>>;
	scoreboard_reset_time: string;
	player_scores: ScoreEntry[];
	clan_scores: ScoreEntry[];
};

type ScoreEntry = {
	uuid: string;
	name: string;
	score: number;
};

document.addEventListener("DOMContentLoaded", async () => {
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	let stats: CloudStats;
	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/cloud_data`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as CloudStats;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	loadingElement.hidden = true;
	statsElement.hidden = false;

	byId("stat-playersonline").innerText = stats.players_online.toLocaleString();

	const gamePlayerCountEntries = Object.entries(stats.game_player_count) as [GameType, number][];
	gamePlayerCountEntries.sort(([a], [b]) => getGameTypeIndex(a) - getGameTypeIndex(b));

	const gameTypeTable = byId<HTMLTableElement>("stat-gmonline");
	for (const [gameType, count] of gamePlayerCountEntries) {
		const nameColumn = document.createElement("td");
		nameColumn.innerText = getGameTypeName(gameType);
		nameColumn.style.width = "150px";

		const countColumn = document.createElement("td");
		countColumn.innerText = count.toLocaleString();
		countColumn.style.width = "50px";

		const row = document.createElement("tr");
		row.append(nameColumn, countColumn);

		gameTypeTable.appendChild(row);
	}

	populateScoreboard(byId<HTMLTableElement>("stat-scoreboard-players"), stats.player_scores, "player.html");
	populateScoreboard(byId<HTMLTableElement>("stat-scoreboard-clans"), stats.clan_scores, "clan.html");
});

function getGameTypeIndex(gameType: GameType): number {
	switch (gameType) {
		case "boot":
			return 0;
		case "dom":
			return 1;
		case "conq":
			return 2;
		case "tdm":
			return 3;
		case "gg":
			return 4;
		case "ffa":
			return 5;
		case "inf":
			return 6;
		case "sg":
			return 7;
		case "ttt":
			return 8;
		case "def":
			return 9;
		case "mov":
			return 10;
		case "camp":
			return 11;
		case "lob":
			return 12;
		default:
			return 13;
	}
}

function populateScoreboard(table: HTMLTableElement, entries: ScoreEntry[], hrefBase: string) {
	for (const [i, entry] of entries.entries()) {
		table.appendChild(
			createRow(
				{},
				{ contents: (i + 1).toLocaleString(), width: "40px" },
				{ contents: createAnchor(entry.name, `${hrefBase}?uuid=${entry.uuid}`), width: "160px" },
				{ contents: entry.score.toLocaleString(), width: "130px" },
			),
		);
	}
}
