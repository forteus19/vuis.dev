import { byId } from "../common";

const usernameRegex = new RegExp("^[a-zA-Z0-9_]{3,16}$");

function testName(name: string): boolean {
	if (name === "") {
		return true;
	} else if (!usernameRegex.test(name)) {
		alert("Invalid username");
		return true;
	} else {
		return false;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const searchInput = byId<HTMLInputElement>("search-input");
	const viewStatsButton = byId<HTMLButtonElement>("view-stats-button");
	const viewArmoryButton = byId<HTMLButtonElement>("view-armory-button");

	viewStatsButton.addEventListener("click", () => {
		const name = searchInput.value;
		if (testName(name)) {
			return;
		}
		document.location.assign(`player.html?name=${name}`);
	});

	viewArmoryButton.addEventListener("click", () => {
		const name = searchInput.value;
		if (testName(name)) {
			return;
		}
		document.location.assign(`armory.html?name=${name}`);
	});
});
