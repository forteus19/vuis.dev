import { BFAPI_HOST, byId, formatPlayerStub, getGameTypeName, type BfApiError, type GameType, type PlayerStub } from "../common";

type Status = {
	online: boolean;
	party: "none" | "host" | "member";
	server: string | null;
	match: {
		uuid: string;
		map_name: string;
		game: GameType;
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
	const playerUuid = urlParams.get("uuid");
	if (playerUuid === null) {
		titleElement.innerText = "missing uuid!";
		loadingElement.hidden = true;
		return;
	}

	titleElement.innerText = `Status for player ${playerUuid}`;

	const fetchParams = new URLSearchParams({ uuid: playerUuid });

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

		byId("stat-gamemode").innerText = getGameTypeName(match.game);
		byId("stat-map").innerText = match.map_name;
		const playerCountElement = byId("stat-players");
		playerCountElement.innerText = `${match.players.length}/${match.max_players}`;
		if (match.max_players > 16) {
			playerCountElement.style.color = "yellow";
		}

		const playerListElement = byId("stat-matchplayers");
		for (const player of match.players) {
			const matchPlayerLink = document.createElement("a");
			matchPlayerLink.innerText = formatPlayerStub(player);
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
