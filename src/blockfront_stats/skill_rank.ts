import type { SkillRank } from "../common";
import { createBold, createBreak, createImage, createSpan } from "../dom_util";

const SKILL_RANK_IMAGES = Object.entries(import.meta.glob("../assets/bf_skill_ranks/*.png", { eager: true, query: "?url", import: "default" }))
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url) as string[];

const SKILL_RANK_FLOORS = [
	0,
	820,
	860,
	900,
	940,
	980,
	1010,
	1050,
	1080,
	1120,
	1160,
	1200,
	1240,
	1300,
	1350,
	1470
]

export function createSkillRankElement(skillRank: SkillRank | null): HTMLDivElement {
	let titleSpan: HTMLSpanElement;
	let imageIndex: number;
	let tooltipElement: HTMLSpanElement | null;

	if (skillRank) {
		const index = skillRank.index;

		titleSpan = createSpan(skillRank.title, skillRank.color);

		const rangeLower = SKILL_RANK_FLOORS[index];
		const rangeUpper = SKILL_RANK_FLOORS[index + 1];

		let range;
		if (rangeLower === undefined) {
			range = "Top 10";
		} else if (rangeUpper === undefined) {
			range = rangeLower.toLocaleString();
		} else {
			range = `${rangeLower.toLocaleString()} - ${rangeUpper.toLocaleString()}`;
		}

		imageIndex = index;

		tooltipElement = document.createElement("span");
		tooltipElement.className = "tooltip";
		tooltipElement.append(
			createBold(`Rank ${index + 1}/17`),
			createBreak(),
			"PS: " + range
		);
	} else {
		titleSpan = createSpan("Unranked", "#AAAAAA");
		imageIndex = SKILL_RANK_IMAGES.length - 1;
		tooltipElement = null;
	}

	const imageElement = createImage(SKILL_RANK_IMAGES[imageIndex]);
	imageElement.width = 64;
	imageElement.height = 32;
	imageElement.style.imageRendering = "pixelated";

	const baseElement = document.createElement("div");
	baseElement.className = "flex-text tooltip-parent";
	baseElement.style.position = "relative";
	baseElement.append(
		"Skill Rank:",
		titleSpan,
		imageElement
	);
	if (tooltipElement) {
		baseElement.append(tooltipElement);
	}

	return baseElement;
}
