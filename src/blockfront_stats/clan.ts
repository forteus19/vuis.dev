import { BFAPI_HOST, byId, type BfApiError, type SkillRank } from "../common";
import { createAnchor, createListItem } from "../dom_util";
import { createSkillRankElement } from "./skill_rank";

type Clan = {
	uuid: string;
	name: string;
	tag: string;
	owner_active_at: string;
	skill_rank: SkillRank | null;
	members: Member[];
	owner: number;
	top_players: number[];
};

type Member = {
	uuid: string;
	name: string;
	officer: boolean;
	online: boolean;
};

type MemberEx = Member & {
	owner: boolean;
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

	titleElement.innerText = `Stats for brigade ${stats.tag}`;

	loadingElement.hidden = true;
	statsElement.hidden = false;

	const members = stats.members.map((member, i) => {
		return {
			...member,
			owner: i === stats.owner
		} as MemberEx;
	}).sort((a, b) => {
		return getMemberOrder(b) - getMemberOrder(a);
	});

	byId("stat-name").innerText = stats.name;
	byId("stat-skillrank").append(createSkillRankElement(stats.skill_rank));

	byId("stat-members-count").innerText = members.length.toString();

	const membersElement = byId("stat-members");
	for (const member of members) {
		const memberLink = createAnchor(member.name, `player.html?uuid=${member.uuid}`);

		const memberElement = createListItem(memberLink);

		if (member.owner) {
			memberLink.style.color = "#FFFF55";
			memberElement.append(" (Leader)");
		}

		if (member.officer) {
			memberLink.style.color = "#FFAA00";
			memberElement.append(" (Officer)");
		}

		membersElement.appendChild(memberElement);
	}
});

function getMemberOrder(member: MemberEx): number {
	if (member.owner) {
		return 2;
	}
	if (member.officer) {
		return 1;
	}
	return 0;
}
