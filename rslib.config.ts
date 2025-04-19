import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";
import pluginTailwind from "@tailwindcss/postcss";

export default defineConfig({
  source: {
    entry: {
      index: ["./src/**"],
    },
  },
  lib: [
    {
      bundle: false,
      dts: true,
      format: "esm",
    },
  ],
  output: {
    target: "web",
  },
  tools: {
    postcss: (opts, { addPlugins }) => {
      addPlugins(pluginTailwind);
    },
  },
  plugins: [pluginReact()],
});
