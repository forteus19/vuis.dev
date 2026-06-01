import { BFAPI_HOST, byId, type BfApiError, type PlayerStub } from "../common";

type Status = {
	online: boolean;
	party: "none" | "host" | "member";
	server: string | null;
	match: {
		uuid: string;
		map_name: string;
		game: string;
		max_players: number;
		accepting_players: boolean;
		settings: {
			team_size_limit: boolean;
		};
		players: PlayerStub[];
	} | null;
	player: PlayerStub;
};

document.addEventListener("DOMContentLoaded", async () => {
	const playerLink = byId<HTMLAnchorElement>("player-link");
	const inventoryLink = byId<HTMLAnchorElement>("inventory-link");

	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	const urlParams = new URLSearchParams(window.location.search);
	if (!urlParams.has("uuid") && !urlParams.has("name")) {
		titleElement.innerText = "missing uuid/name!";
		loadingElement.hidden = true;
		return;
	}
	const playerUuid = urlParams.get("uuid");
	const playerName = urlParams.get("name");

	titleElement.innerText = `Status for player ${playerName === null ? playerUuid : playerName}`;

	const fetchParams = new URLSearchParams(playerName === null ? { uuid: playerUuid as string } : { name: playerName });

	let stats: Status;
	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/player_status?${fetchParams}`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as Status;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	playerLink.href = `player.html?uuid=${stats.player.uuid}`;
	playerLink.hidden = false;
	inventoryLink.href = `armory.html?uuid=${stats.player.uuid}`;
	inventoryLink.hidden = false;

	if (stats.player.name !== "Unknown") {
		titleElement.innerText = `Status for player ${stats.player.name}`;
	}

	loadingElement.hidden = true;
	statsElement.hidden = false;

	const onlineElement = byId("stat-online");
	onlineElement.innerText = getStatusName(stats);
	onlineElement.style.color = stats.online ? "lime" : "red";
	byId("stat-party").innerText = stats.party.charAt(0).toUpperCase() + stats.party.slice(1);

	const match = stats.match;

	if (stats.online && match !== null) {
		byId("match-content").hidden = false;

		byId("stat-gamemode").innerText = getGamemodeName(match.game);
		byId("stat-map").innerText = match.map_name;
		const playerCountElement = byId("stat-players");
		playerCountElement.innerText = `${match.players.length}/${match.max_players}`;
		if (match.max_players > 16) {
			playerCountElement.style.color = "yellow";
		}

		const playerListElement = byId("stat-matchplayers");
		for (const player of match.players) {
			const matchPlayerLink = document.createElement("a");
			matchPlayerLink.innerText = player.name === "Unknown" ? `Unknown (${player.uuid})` : player.name;
			matchPlayerLink.href = `player.html?uuid=${player.uuid}`;

			const matchPlayerListItem = document.createElement("li");
			matchPlayerListItem.appendChild(matchPlayerLink);

			playerListElement.appendChild(matchPlayerListItem);
		}
	}
});

function getStatusName(status: Status): string {
	if (status.online) {
		if (status.server !== null) {
			return "In Match";
		}
		switch (status.party) {
			case "host":
				return "Party (Host)";
			case "member":
				return "Party";
			default:
				return "Online";
		}
	} else {
		return "Offline";
	}
}

function getGamemodeName(gamemode: string): string {
	switch (gamemode) {
		case "boot":
			return "Bootcamp";
		case "dom":
			return "Domination";
		case "conq":
			return "Conquest";
		case "tdm":
			return "Team Deathmatch";
		case "gg":
			return "Gun Game";
		case "ffa":
			return "Free For All";
		case "inf":
			return "Infected";
		case "sg":
			return "Survival Games";
		case "ttt":
			return "Trouble Town";
		case "def":
			return "Defusal";
		case "mov":
			return "Movie Studio";
		case "camp":
			return "Campaign";
		default:
			return "Unknown";
	}
}
