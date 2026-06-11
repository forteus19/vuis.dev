import { BFAPI_HOST, byId, getGameTypeName, type BfApiError, type GameType, type NamedStub } from "../common";
import { createAnchor, createRow } from "../dom_util";

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
		gameTypeTable.appendChild(createRow({}, { contents: getGameTypeName(gameType), width: "150px" }, { contents: count.toLocaleString(), width: "50px" }));
	}

	populateScoreboard(byId<HTMLTableElement>("stat-scoreboard-players"), stats.player_scores, "player.html", "player", "/api/v1/player_data/bulk?stub=true");
	populateScoreboard(byId<HTMLTableElement>("stat-scoreboard-clans"), stats.clan_scores, "clan.html", "clan", "/api/v1/clan_data/bulk?stub=true");
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

function populateScoreboard(table: HTMLTableElement, entries: ScoreEntry[], hrefBase: string, idBase: string, bulkEndpoint: string) {
	const unknownUuids: string[] = [];

	for (const [i, entry] of entries.entries()) {
		table.appendChild(
			createRow(
				{},
				{ contents: (i + 1).toLocaleString(), width: "40px" },
				{ contents: createAnchor(entry.name ?? "#", `${hrefBase}?uuid=${entry.uuid}`, `sbrow-${idBase}-${entry.uuid}`), width: "160px" },
				{ contents: entry.score.toLocaleString(), width: "130px" },
			),
		);

		if (!entry.name) {
			unknownUuids.push(entry.uuid);
		}
	}

	if (!unknownUuids.length) {
		return;
	}

	fetch(BFAPI_HOST + bulkEndpoint, {
		method: "POST",
		body: unknownUuids.join(","),
	})
		.then((response) => response.json())
		.then((json: NamedStub[]) => {
			for (const stub of json) {
				byId(`sbrow-${idBase}-${stub.uuid}`).innerText = stub.name ?? "~error~";
			}
		});
}
