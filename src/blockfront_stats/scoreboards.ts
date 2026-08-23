import { byId, CLOUD_API_HOST } from "../common";
import { createAnchor, createRow } from "../dom_util";

type ScoreboardsResponse = {
	resetTime: number;
	players: ScoreboardEntry[];
	clans: ScoreboardEntry[];
};

type ScoreboardEntry = {
	rank: number;
	uuid: string;
	name: string;
	score: number;
};

document.addEventListener("DOMContentLoaded", async () => {
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	let stats: ScoreboardsResponse;
	try {
		const response = await fetch(`${CLOUD_API_HOST}/api/v2/?type=scoreboard`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = "unknown error";
			return;
		}

		stats = json as ScoreboardsResponse;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	loadingElement.hidden = true;
	statsElement.hidden = false;

	populateScoreboard(stats.players, "players", "player.html");
	populateScoreboard(stats.clans, "clans", "clan.html");
});

function populateScoreboard(entries: ScoreboardEntry[], name: string, hrefBase: string) {
	const table = byId<HTMLTableElement>(`stat-scoreboard-${name}`);

	for (let i = 0; i < entries.length && i < 30; i++) {
		table.appendChild(createEntryRow(entries[i], hrefBase));
	}

	if (entries.length <= 30) {
		return;
	}

	const showMoreButton = byId<HTMLButtonElement>(`expand-${name}-button`);

	showMoreButton.addEventListener("click", function () {
		for (let i = 30; i < entries.length; i++) {
			table.appendChild(createEntryRow(entries[i], hrefBase));
		}
		this.hidden = true;
	});

	showMoreButton.hidden = false;
}

function createEntryRow(entry: ScoreboardEntry, hrefBase: string) {
	return createRow(
		{},
		{ contents: entry.rank.toLocaleString(), width: "40px" },
		{ contents: createAnchor(entry.name ?? "#", `${hrefBase}?uuid=${entry.uuid}`), width: "160px" },
		{ contents: entry.score.toLocaleString(), width: "130px" },
	);
}
