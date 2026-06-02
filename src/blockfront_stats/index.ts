import { byId, setLastSearch } from "../common";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
const USER_API_ENDPOINT = "https://api.ashcon.app/mojang/v2/user/";

type UserResponse = {
	uuid: string;
	username: string;
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
		fetchingText.innerText = "Fetching profile...";
		fetchingText.hidden = false;
		fetchProfile(name)
			.then((profile) => {
				setLastSearch({
					uuid: profile.uuid,
					name: profile.username,
				});
				document.location.assign(`${hrefBase}?uuid=${profile.uuid}`);
			})
			.catch((reason) => (fetchingText.innerText = `${reason}`));
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

async function fetchProfile(name: string): Promise<UserResponse> {
	return fetch(USER_API_ENDPOINT + name).then((res) => {
		if (res.ok) {
			return res.json() as Promise<UserResponse>;
		} else {
			throw "user not found";
		}
	});
}
