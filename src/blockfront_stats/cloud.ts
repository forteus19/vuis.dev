import { BFAPI_HOST, byId, getGameTypeIndex, getGameTypeName, type BfApiError, type GameType, type NamedStub } from "../common";
import { createRow } from "../dom_util";

type CloudStats = {
	players_online: number;
	game_player_count: Partial<Record<GameType, number>>;
	scoreboard_reset_time: string;
	player_scores: ScoreEntry[];
	clan_scores: ScoreEntry[];
};

type ScoreEntry = NamedStub & {
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
		gameTypeTable.appendChild(
			createRow(
				{},
				{ contents: getGameTypeName(gameType), width: "150px" },
				{ contents: count.toLocaleString(), width: "50px" }
			)
		);
	}
});
