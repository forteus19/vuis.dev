import "./common.css";

export function byId<ElementType extends HTMLElement>(id: string): ElementType {
	return document.getElementById(id) as ElementType;
}

export function intToHexColor(n: number): string {
	return "#" + ((n >>> 0) & 0xffffff).toString(16).padStart(6, "0");
}

// bf stats

export type BfApiError = {
	error: string;
};

export type NamedStub = {
	uuid: string;
	name?: string;
};

export type LastSearch = {
	uuid: string;
	name: string;
};

export type GameType = "boot" | "dom" | "conq" | "tdm" | "gg" | "ffa" | "inf" | "sg" | "ttt" | "def" | "mov" | "camp" | "lob";

export const BFAPI_HOST = "https://blockfrontapi.vuis.dev";
// export const BFAPI_HOST = "http://localhost:19190";
export const PRESTIGE_EXP = 253_001;

const LAST_SEARCH_KEY = "lastSearch";

export function formatStub(stub: NamedStub): string {
	return stub.name ?? stub.uuid;
}

export function getLastSearch(): LastSearch | null {
	const lastSearch = sessionStorage.getItem(LAST_SEARCH_KEY);
	try {
		return lastSearch !== null ? JSON.parse(lastSearch) : null;
	} catch (e) {
		return null;
	}
}

export function setLastSearch(stub: LastSearch) {
	sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(stub));
}

export function clearLastSearch() {
	sessionStorage.removeItem(LAST_SEARCH_KEY);
}

export function retrieveLastUsername(expectedUuid: string): string | null {
	const lastSearch = getLastSearch();
	if (lastSearch !== null && lastSearch.uuid === expectedUuid) {
		return lastSearch.name;
	} else {
		clearLastSearch();
		return null;
	}
}

export function createAvatarElement(uuid: string): HTMLImageElement {
	const element = document.createElement("img");
	element.src = `https://mc-heads.net/avatar/${uuid}/24`;

	return element;
}

export function getGameTypeName(gameType: GameType): string {
	switch (gameType) {
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
		case "lob":
			return "Lobby";
		default:
			return "Unknown";
	}
}
