// Metro entry shim for monorepo Android release builds (assembleRelease).
// Gradle/Metro resolve --entry-file index.js from the repository root.
// Application code lives in apps/mobile — see scripts/mobile/README.md.
import "./apps/mobile/index.js";
