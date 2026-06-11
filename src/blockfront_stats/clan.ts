import { BFAPI_HOST, byId, formatStub, type BfApiError, type NamedStub } from "../common";
import { createAnchor, createListItem } from "../dom_util";

type Clan = {
	uuid: string;
	name: string;
	owner: NamedStub;
	members: NamedStub[];
};

document.addEventListener("DOMContentLoaded", async () => {
	const titleElement = byId<HTMLHeadingElement>("title");
	const loadingElement = byId<HTMLParagraphElement>("loading-text");
	const statsElement = byId<HTMLDivElement>("stats-content");

	const urlParams = new URLSearchParams(window.location.search);
	const clanUuid = urlParams.get("uuid");
	if (!clanUuid) {
		titleElement.innerHTML = "missing uuid!";
		loadingElement.hidden = true;
		return;
	}

	titleElement.innerText = `Stats for brigade ${clanUuid}`;

	const fetchParams = new URLSearchParams({ uuid: clanUuid });

	let stats: Clan;
	try {
		const response = await fetch(`${BFAPI_HOST}/api/v1/clan_data?${fetchParams}`);

		const json = await response.json();

		if (!response.ok) {
			loadingElement.innerText = `error: ${(json as BfApiError).error}`;
			return;
		}

		stats = json as Clan;
	} catch (err) {
		loadingElement.innerText = `error: ${err}`;
		return;
	}

	titleElement.innerText = `Stats for brigade ${stats.name}`;

	loadingElement.hidden = true;
	statsElement.hidden = false;

	const ownerElement = byId<HTMLAnchorElement>("stat-owner");
	ownerElement.innerText = formatStub(stats.owner);
	ownerElement.href = `player.html?uuid=${stats.owner.uuid}`;

	const membersElement = byId("stat-members");
	for (const member of stats.members) {
		membersElement.appendChild(createListItem(createAnchor(formatStub(member), `player.html?uuid=${member.uuid}`)));
	}
});
