import { byId, setLastSearch } from "../common";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
const USER_API_ENDPOINT = "https://playerdb.co/api/player/minecraft/";

type UserResponse = {
	data: {
		player: {
			username: string;
			id: string;
		}
	}
	// dont care about other fields
};

document.addEventListener("DOMContentLoaded", () => {
	const searchInput = byId<HTMLInputElement>("search-input");
	const viewStatsButton = byId<HTMLButtonElement>("view-stats-button");
	const viewArmoryButton = byId<HTMLButtonElement>("view-armory-button");
	const fetchingText = byId<HTMLParagraphElement>("fetching-text");

	fetchingText.hidden = true;

	function fetchAndVisit(hrefBase: string) {
		const name = searchInput.value;
		if (testName(name)) {
			return;
		}
		fetchingText.innerText = "Fetching profile...";
		fetchingText.hidden = false;
		fetchProfile(name)
			.then((profile) => {
				const player = profile.data.player;
				setLastSearch({
					uuid: player.id,
					name: player.username,
				});
				document.location.assign(`${hrefBase}?uuid=${player.id}`);
			})
			.catch((reason) => {
				console.error(reason);
				fetchingText.innerText = `${reason}`;
			});
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
