#!/usr/bin/env node
/**
 * NEXVION — static asset optimiser (Docker `builder` stage, shared by services).
 *
 * The NEXVION application is plain HTML/CSS/JS that ships as-is from the repo.
 * There is no bundler and no upstream build step, so this script is what makes
 * each container image a real build artefact rather than a file copy: it minifies
 * that service's documents, stylesheets and scripts, then reports before/after
 * byte savings.
 *
 * Usage:  node minify.mjs <service>
 *   storefront | checkout | assets
 *
 * The critical design decision is the INTEGRITY CHECKS at the bottom. Minifying
 * JavaScript that drives a cart and checkout flow is only safe if we can prove
 * nothing structural was lost. A silently mangled selector or a dropped
 * localStorage key would surface as "the demo is broken" rather than as a build
 * failure, so we assert the invariants and fail the build instead.
 */

import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJs } from "terser";

const SRC = "/build/src";
const OUT = "/build/out";

/**
 * Per-service asset manifests.
 *
 * style.css appears in BOTH storefront and checkout because every NEXVION page
 * includes it — the two documents share a base stylesheet. That duplication is a
 * real consequence of splitting a monolith into independently-built images: a
 * shared asset has to either be copied into each image, or published as a
 * versioned package/import-map. Copying it is the pragmatic choice at this size
 * (~17 KB) and keeps each image self-contained with no runtime dependency on
 * the other services.
 */
const SERVICES = {
  storefront: {
    html: ["index.html", "products.html"],
    css: ["style.css", "products.css"],
    js: ["script.js"],
    binary: [],
  },
  checkout: {
    html: ["payment.html"],
    css: ["style.css", "payment.css"],
    js: ["payment.js"],
    binary: [],
  },
  assets: {
    html: [],
    css: [],
    js: [],
    binary: ["logo.png"],
  },
};

/**
 * Storage-key invariants.
 *
 * Deliberately NOT a hardcoded list of keys. The keys are split across the two
 * scripts — nexvionCart / nexvionUsers / nexvionCurrentUser / nexvionCheckout
 * live in script.js, while nexvionLastOrder exists only in payment.js — so a
 * global checklist either fails on a file that legitimately lacks a key, or gets
 * weakened into only checking one file.
 *
 * Instead the keys are DISCOVERED from each source file and then asserted against
 * that file's minified output. Any key the application actually uses must
 * survive, and the check stays correct for whichever subset of files a service
 * happens to build.
 *
 * This matters because localStorage keys are string literals, and losing one
 * silently logs shoppers out and empties their baskets — a failure mode that
 * cannot be diagnosed from a screenshot.
 */
const extractStorageKeys = (source) => [
  ...new Set([...source.matchAll(/["'`]((?:nexvion|davine)[A-Za-z]+)["'`]/g)].map((m) => m[1])),
];

const serviceName = process.argv[2];
const service = SERVICES[serviceName];

if (!service) {
  console.error(`[minify] unknown service "${serviceName}" — expected one of: ${Object.keys(SERVICES).join(", ")}`);
  process.exit(1);
}

const results = [];

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const record = (file, before, after) => results.push({ file, before, after });

// Collected across every loop below and reported together at the end, so a run
// reports every problem it found rather than only the first.
const failures = [];

mkdirSync(OUT, { recursive: true });

for (const file of service.binary) {
  copyFileSync(join(SRC, file), join(OUT, file));
  record(file, statSync(join(SRC, file)).size, statSync(join(OUT, file)).size);
}

for (const file of service.css) {
  const input = readFileSync(join(SRC, file), "utf8");
  const output = new CleanCSS({ level: 2, returnPromise: false }).minify(input);

  if (output.errors.length > 0) {
    throw new Error(`clean-css failed on ${file}: ${output.errors.join(", ")}`);
  }
  if (output.warnings.length > 0) {
    console.warn(`[minify] ${file}: ${output.warnings.join(", ")}`);
  }

  writeFileSync(join(OUT, file), output.styles);
  record(file, Buffer.byteLength(input), Buffer.byteLength(output.styles));
}

for (const file of service.js) {
  const input = readFileSync(join(SRC, file), "utf8");
  const expectedKeys = extractStorageKeys(input);

  if (expectedKeys.length === 0) {
    failures.push(`${file}: no localStorage keys discovered — the key extractor is broken, refusing to pass the build silently`);
  }

  // `mangle` is left at its default of `toplevel: false` on purpose: the app
  // exposes helpers such as money()/cartTotal() as global function declarations,
  // and renaming them would break the unit test suite that loads this file.
  const output = await minifyJs(input, {
    compress: { passes: 2 },
    mangle: { toplevel: false },
    format: { comments: false, ascii_only: false },
  });

  if (typeof output.code !== "string" || output.code.length === 0) {
    throw new Error(`terser produced no output for ${file}`);
  }

  writeFileSync(join(OUT, file), output.code);
  record(file, Buffer.byteLength(input), Buffer.byteLength(output.code));

  const verifiedKeys = new Set();
  for (const key of expectedKeys) {
    if (output.code.includes(key)) {
      verifiedKeys.add(key);
    } else {
      failures.push(`${file}: localStorage key "${key}" was lost during minification`);
    }
  }

  if (verifiedKeys.size > 0) {
    console.log(`[minify]   ${file}: preserved ${verifiedKeys.size} storage key(s) — ${[...verifiedKeys].join(", ")}`);
  }
}

for (const file of service.html) {
  const input = readFileSync(join(SRC, file), "utf8");

  // Conservative option set. `removeAttributeQuotes` stays off and
  // `caseSensitive` stays on: the documents contain inline `onerror` handlers
  // and mixed-case attributes, and aggressive HTML minification is the single
  // easiest way to break a static site that has no upstream test suite.
  const output = await minifyHtml(input, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeEmptyAttributes: false,
    minifyCSS: false,
    minifyJS: false,
    useShortDoctype: true,
    caseSensitive: true,
    continueOnParseError: true,
  });

  writeFileSync(join(OUT, file), output);
  record(file, Buffer.byteLength(input), Buffer.byteLength(output));
}

// ---------------------------------------------------------------------------
// Integrity checks — the build fails loudly rather than shipping a broken site
// ---------------------------------------------------------------------------
// The localStorage-key assertions happen inside the JS loop above, where both the
// source and the minified output are already in scope.

const extractIds = (html) => new Set([...html.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((m) => m[1]));

for (const file of service.html) {
  const before = extractIds(readFileSync(join(SRC, file), "utf8"));
  const after = extractIds(readFileSync(join(OUT, file), "utf8"));

  const lost = [...before].filter((id) => !after.has(id));
  const gained = [...after].filter((id) => !before.has(id));

  if (lost.length > 0) {
    failures.push(`${file}: lost element id(s) — ${lost.join(", ")}`);
  }
  if (gained.length > 0) {
    failures.push(`${file}: unexpected new element id(s) — ${gained.join(", ")}`);
  }
}

for (const file of [...service.html, ...service.css, ...service.js, ...service.binary]) {
  if (statSync(join(OUT, file)).size === 0) {
    failures.push(`${file}: minified output is empty`);
  }
}

if (failures.length > 0) {
  console.error(`[minify] BUILD ABORTED for service "${serviceName}" — integrity checks failed:`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Size report (lands in the build log so CI can archive it as release evidence)
// ---------------------------------------------------------------------------

const totalBefore = results.reduce((sum, r) => sum + r.before, 0);
const totalAfter = results.reduce((sum, r) => sum + r.after, 0);
const saved = totalBefore === 0 ? 0 : (1 - totalAfter / totalBefore) * 100;

console.log(`[minify] service="${serviceName}"`);
for (const { file, before, after } of results) {
  const delta = before === after ? "  (unchanged)" : `  (-${((1 - after / before) * 100).toFixed(0)}%)`;
  console.log(`[minify]   ${file.padEnd(16)} ${kb(before).padStart(10)} -> ${kb(after).padStart(10)}${delta}`);
}
console.log(`[minify]   ${"TOTAL".padEnd(16)} ${kb(totalBefore).padStart(10)} -> ${kb(totalAfter).padStart(10)}  (-${saved.toFixed(1)}%)`);
console.log(`[minify]   integrity checks passed (${service.html.length} HTML, ${service.css.length} CSS, ${service.js.length} JS, ${service.binary.length} binary)`);