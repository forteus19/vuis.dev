export function createBreak(): HTMLBRElement {
	return document.createElement("br");
}

function createGenericText(tagName: string, text: string, color?: string): HTMLElement {
	const element = document.createElement(tagName);
	element.innerText = text;
	if (color) {
		element.style.color = color;
	}

	return element;
}

export function createSpan(text: string, color?: string): HTMLSpanElement {
	return createGenericText("span", text, color) as HTMLSpanElement;
}

export function createBold(text: string, color?: string): HTMLElement {
	return createGenericText("b", text, color);
}

export function createItalic(text: string, color?: string): HTMLElement {
	return createGenericText("i", text, color);
}

export function createAnchor(text: string, href: string, id?: string, color?: string): HTMLAnchorElement {
	const element = createGenericText("a", text, color) as HTMLAnchorElement;
	element.href = href;
	if (id) {
		element.id = id;
	}

	return element;
}

export function createListItem(contents: Node): HTMLLIElement {
	const element = document.createElement("li");
	element.appendChild(contents);

	return element;
}

export function createImage(src: string): HTMLImageElement {
	const element = document.createElement("img");
	element.src = src;

	return element;
}

export type Contents = string | Node | (string | Node)[];
export type ContentsEx = {
	contents: Contents | null;
	id?: string;
	className?: string;
	color?: string;
	width?: string;
};

function handleContents(element: HTMLElement, contents: Contents) {
	if (typeof contents === "string") {
		element.innerText = contents;
	} else if (Array.isArray(contents)) {
		element.append(...contents);
	} else {
		element.appendChild(contents);
	}
}

export function createRow(options: { header?: boolean; color?: string }, ...columns: (Contents | ContentsEx)[]): HTMLTableRowElement {
	const row = document.createElement("tr");

	for (const column of columns) {
		const element = document.createElement(options.header && options.header ? "th" : "td");

		if (typeof column === "object" && "contents" in column) {
			if (column.contents) {
				handleContents(element, column.contents);
			}
			if (column.id) {
				element.id = column.id;
			}
			if (column.className) {
				element.className = column.className;
			}
			if (column.color) {
				element.style.color = column.color;
			}
			if (column.width) {
				element.style.width = column.width;
			}
		} else {
			handleContents(element, column);
		}

		row.appendChild(element);
	}

	if (options.color) {
		row.style.backgroundColor = options.color;
	}

	return row;
}
