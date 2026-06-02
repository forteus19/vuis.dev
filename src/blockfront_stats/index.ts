import { byId } from "../common";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
const USER_API_ENDPOINT = "https://api.ashcon.app/mojang/v2/user/";

type UserResponse = {
	uuid: string;
	// dont care about other fields
};

document.addEventListener("DOMContentLoaded", () => {
	const searchInput = byId<HTMLInputElement>("search-input");
	const viewStatsButton = byId<HTMLButtonElement>("view-stats-button");
	const viewArmoryButton = byId<HTMLButtonElement>("view-armory-button");
	const fetchingText = byId<HTMLParagraphElement>("fetching-text");

	function fetchAndVisit(hrefBase: string) {
		const name = searchInput.value;
		if (testName(name)) {
			return;
		}
		fetchingText.hidden = false;
		fetchUuid(name).then(uuid => document.location.assign(`${hrefBase}?uuid=${uuid}`));
	}

	viewStatsButton.addEventListener("click", () => fetchAndVisit("player.html"));
	viewArmoryButton.addEventListener("click", () => fetchAndVisit("armory.html"));
});

function testName(name: string): boolean {
	if (name === "") {
		return true;
	} else if (!USERNAME_REGEX.test(name)) {
		alert("Invalid username");
		return true;
	} else {
		return false;
	}
}

async function fetchUuid(name: string): Promise<string> {
	return fetch(USER_API_ENDPOINT + name).then(res => res.json() as Promise<UserResponse>).then(json => json.uuid);
}
