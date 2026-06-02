import { BFAPI_HOST, byId, PRESTIGE_EXP, type BfApiError } from "../../common";

type Leaderboard = {
	last_updated: string;
	leaderboard: LeaderboardEntry[];
};

type LeaderboardEntry = [
	string, // base64 uuid
	string, // username
	number, // total exp
	number, // prestige
	number, // scoreboarded (0 = no, 1 = yes)
	number, // time played (seconds)
];

const PRESTIGE_COLORS = ["#aaaaaa", "#efb1aa", "#eadea1", "#c6efa5", "#97ccef", "#c1b0f4", "#f4b0ec"];

let data: LeaderboardEntry[] | null = null;

document.addEventListener("DOMContentLoaded", async () => {
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");
	const pageSelect = byId<HTMLSelectElement>("page-select");

	let stats: Leaderboard;
	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/ucd/player_exp_leaderboard`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as Leaderboard;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	data = [...stats.leaderboard];

	loadingElement.hidden = true;
	statsElement.hidden = false;

	byId("stat-lastupdated").innerText = new Date(stats.last_updated).toLocaleString();

	const pages = Math.ceil(data.length / 50);
	for (let i = 0; i < pages; i++) {
		const pageOption = document.createElement("option");
		pageOption.innerText = (i + 1).toLocaleString();
		pageOption.value = i.toString();

		pageSelect.appendChild(pageOption);
	}

	byId<HTMLSelectElement>("sort-select").addEventListener("change", () => buildTable());
	pageSelect.addEventListener("change", () => buildTable());
	byId<HTMLInputElement>("prestige-select").addEventListener("change", () => buildTable());

	buildTable();
});

function buildTable() {
	if (data === null) {
		return;
	}

	let entryComparator: (a: LeaderboardEntry, b: LeaderboardEntry) => number;
	switch (byId<HTMLSelectElement>("sort-select").value) {
		default:
			entryComparator = getTotalExpComparator();
			break;
		case "time":
			entryComparator = getTimePlayedComparator();
			break;
	}
	data.sort(entryComparator);

	const page = parseInt(byId<HTMLSelectElement>("page-select").value);
	const theoreticalPrestige = byId<HTMLInputElement>("prestige-select").checked;

	const leaderboardTable = byId<HTMLTableElement>("stat-leaderboard");

	leaderboardTable.replaceChildren();

	leaderboardTable.appendChild(buildHeaderRow());
	for (const [i, entry] of data.slice(page * 50, (page + 1) * 50).entries()) {
		leaderboardTable.appendChild(buildEntryRow(entry, i + page * 50 + 1, theoreticalPrestige));
	}
}

function buildHeaderRow(): HTMLTableRowElement {
	const placeColumn = document.createElement("th");
	placeColumn.innerText = "#";
	placeColumn.style.width = "40px";

	const prestigeColumn = document.createElement("th");
	prestigeColumn.innerText = "P";
	prestigeColumn.style.width = "40px";

	const nameColumn = document.createElement("th");
	nameColumn.innerText = "Name";
	nameColumn.style.width = "170px";

	const expColumn = document.createElement("th");
	expColumn.innerText = "Total EXP";
	expColumn.style.width = "120px";

	const timePlayedColumn = document.createElement("th");
	timePlayedColumn.innerText = "Time Played";
	timePlayedColumn.style.width = "120px";

	const row = document.createElement("tr");
	row.append(placeColumn, prestigeColumn, nameColumn, expColumn, timePlayedColumn);

	return row;
}

function buildEntryRow(entry: LeaderboardEntry, place: number, theoreticalPrestige: boolean): HTMLTableRowElement {
	const isGeneral = entry[2] - entry[3] * PRESTIGE_EXP > PRESTIGE_EXP;
	const prestige = theoreticalPrestige ? getTheoreticalPrestige(entry[2]) : entry[3];

	const placeBold = document.createElement("b");
	placeBold.innerText = place.toLocaleString();
	const placeColumn = document.createElement("td");
	placeColumn.appendChild(placeBold);

	const prestigeBold = document.createElement("b");
	prestigeBold.innerText = `${prestige}${isGeneral && !theoreticalPrestige ? "*" : ""}`;
	prestigeBold.style.color = getPrestigeColor(prestige);
	const prestigeColumn = document.createElement("td");
	prestigeColumn.appendChild(prestigeBold);

	const nameLink = document.createElement("a");
	nameLink.innerText = entry[1];
	nameLink.href = `../player.html?uuid=${decodeBase64Uuid(entry[0])}`;
	if (entry[4] !== 0) {
		nameLink.style.color = "#a9d3ae";
	}
	const nameColumn = document.createElement("td");
	nameColumn.appendChild(nameLink);

	const expColumn = document.createElement("td");
	expColumn.innerText = entry[2].toLocaleString();

	const timePlayedColumn = document.createElement("td");
	timePlayedColumn.innerText = `${(entry[5] / 3600).toFixed(1)}h`;

	const row = document.createElement("tr");
	row.append(placeColumn, prestigeColumn, nameColumn, expColumn, timePlayedColumn);

	return row;
}

function decodeBase64Uuid(encodedUuid: string): string {
	const base64 = encodedUuid.replaceAll("-", "+").replaceAll("_", "/") + "==";
	const binary = atob(base64);
	const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
	const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");

	return hex.substring(0, 8) + "-" +
		hex.substring(8, 12) + "-" +
		hex.substring(12, 16) + "-" +
		hex.substring(16, 20) + "-" +
		hex.substring(20)
}

function getPrestigeColor(prestige: number): string {
	return PRESTIGE_COLORS[prestige <= 5 ? prestige : 6];
}

function getTheoreticalPrestige(exp: number): number {
	return Math.floor(exp / PRESTIGE_EXP);
}

function getTotalExpComparator(): (a: LeaderboardEntry, b: LeaderboardEntry) => number {
	return (a, b) => {
		return b[2] - a[2];
	};
}

function getTimePlayedComparator(): (a: LeaderboardEntry, b: LeaderboardEntry) => number {
	return (a, b) => {
		return b[5] - a[5];
	};
}
