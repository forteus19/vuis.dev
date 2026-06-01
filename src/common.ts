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

export type PlayerStub = {
	uuid: string;
	name: string;
};

export const BFAPI_HOST = "https://blockfrontapi.vuis.dev";

export function formatPlayerStub(stub: PlayerStub): string {
	if (stub.name === "Unknown") {
		return `Unknown (${stub.uuid})`;
	} else {
		return stub.name;
	}
}
