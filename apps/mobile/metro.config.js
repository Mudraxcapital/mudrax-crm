const path = require("node:path");
const Module = require("node:module");

const projectRoot = __dirname;
const mobileNodeModules = path.resolve(projectRoot, "node_modules");
const mobileTailwind = path.resolve(mobileNodeModules, "tailwindcss");

/**
 * Root Next.js uses Tailwind v4 (hoisted). NativeWind only supports v3, so pin
 * Node resolution to the mobile workspace copy before loading NativeWind.
 * Metro monorepo watch/resolve is handled automatically by expo/metro-config (SDK 52+).
 */
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "tailwindcss" || request.startsWith("tailwindcss/")) {
    try {
      return originalResolveFilename.call(
        this,
        request,
        {
          id: path.join(projectRoot, "metro.config.js"),
          filename: path.join(projectRoot, "metro.config.js"),
          paths: Module._nodeModulePaths(mobileNodeModules),
        },
        isMain,
        options,
      );
    } catch {
      // Fall through to default resolution.
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const resolvedTailwindVersion = require(path.join(mobileTailwind, "package.json")).version;
if (!resolvedTailwindVersion.startsWith("3.")) {
  throw new Error(
    `NativeWind requires Tailwind CSS v3 in apps/mobile (found ${resolvedTailwindVersion}).`,
  );
}

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(projectRoot);

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, "global.css"),
  configPath: path.resolve(projectRoot, "tailwind.config.js"),
  projectRoot,
});
