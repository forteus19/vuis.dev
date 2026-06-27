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
	const fetchingText = byId<HTMLParagraphElement>("fetching-text");

	fetchingText.hidden = true;

	function fetchAndVisit(hrefBase: string) {
		const name = searchInput.value;
		if (name === "") {
			return;
		} else if (!USERNAME_REGEX.test(name)) {
			fetchingText.innerText = "invalid username";
			fetchingText.hidden = false;
			return;
		}

		fetchingText.innerText = "fetching profile...";
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

	byId<HTMLButtonElement>("view-stats-button").addEventListener("click", () => fetchAndVisit("player.html"));
	byId<HTMLButtonElement>("view-armory-button").addEventListener("click", () => fetchAndVisit("armory.html"));
	byId<HTMLButtonElement>("view-matches-button").addEventListener("click", () => fetchAndVisit("matches.html"));
});

async function fetchProfile(name: string): Promise<UserResponse> {
	return fetch(USER_API_ENDPOINT + name).then((res) => {
		if (res.ok) {
			return res.json() as Promise<UserResponse>;
		} else {
			throw "user not found";
		}
	});
}
