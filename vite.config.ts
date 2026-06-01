import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		rolldownOptions: {
			input: [
				resolve(__dirname, "index.html"),
				resolve(__dirname, "blockfront_stats/armory.html"),
				resolve(__dirname, "blockfront_stats/index.html"),
				resolve(__dirname, "blockfront_stats/player.html"),
				resolve(__dirname, "blockfront_stats/status.html"),
			],
		},
	},
	plugins: [ViteMinifyPlugin({})],
	resolve: {
		alias: {
			"@assets": resolve(__dirname, "src/assets"),
		},
	},
});
