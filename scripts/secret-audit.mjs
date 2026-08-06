#!/usr/bin/env node
/**
 * Secret rotation audit — House of EXP ecosystem.
 *
 * Reads the ecosystem secret registry (SECRETS.md) and reports rotation
 * health:
 *   - OVERDUE  — "Next rotation" date has passed (exit code 1, CI/cron gate)
 *   - DUE SOON — within the warning window (default 30 days, --soon N)
 *   - OK       — rotation date comfortably ahead
 *   - UNTRACKED — no "Next rotation" date set (deliberately listed so
 *     nothing silently falls off the radar)
 *
 * Zero dependencies: plain Node ESM, parses the markdown table directly.
 * The registry holds references and dates only — this script never sees
 * secret values. All date math runs on date parts (y/m/d), so timezones and
 * DST can never shift a comparison or the displayed dates.
 *
 * Usage:
 *   node scripts/secret-audit.mjs                # default 30-day window
 *   node scripts/secret-audit.mjs --soon 14      # custom window
 *   node scripts/secret-audit.mjs --file OTHER.md
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function flagValue(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const soonDays = flagValue("--soon", 30);
const fileFlag = args[args.indexOf("--file") + 1];
const registryPath = fileFlag ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "SECRETS.md");

let source;
try {
  source = readFileSync(registryPath, "utf8");
} catch {
  console.error(`secret-audit: cannot read ${registryPath}`);
  process.exit(2);
}

/** Parse an ISO yyyy-mm-dd into a date-part object, or null. */
function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function formatDate(parts) {
  return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
}

/** Whole days from `to` to `from` (positive = from is after to). Pure UTC date math. */
function daysBetween(from, to) {
  const utc = (p) => Date.UTC(p.y, p.m - 1, p.d);
  return Math.round((utc(from) - utc(to)) / 86_400_000);
}

const now = new Date();
const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };

const rows = source
  .split("\n")
  .map((line) => line.split("|").map((cell) => cell.trim()))
  .filter(
    (cells) =>
      cells.length >= 7 &&
      cells[1] !== "" &&
      cells[1] !== "Secret" &&
      !cells[1].includes("---"),
  );

const overdue = [];
const dueSoon = [];
const ok = [];
const untracked = [];

for (const cells of rows) {
  const name = cells[1].replace(/`/g, "");
  const when = parseIsoDate(cells[5]);

  if (!when) {
    untracked.push({ name, rotated: cells[4] || null });
    continue;
  }
  const days = daysBetween(when, today);
  if (days < 0) overdue.push({ name, when, days: -days });
  else if (days <= soonDays) dueSoon.push({ name, when, days });
  else ok.push({ name, when, days });
}

function line(entry, label) {
  const noun = entry.days === 1 ? "day" : "days";
  const direction = label === "OVERDUE" ? "ago" : "left";
  return `  ${label.padEnd(9)} ${entry.name} — next rotation ${formatDate(entry.when)} (${entry.days} ${noun} ${direction})`;
}

console.log(`Secret rotation audit — ${registryPath}`);
console.log(`Today: ${formatDate(today)}  (due-soon window: ${soonDays} days)`);
console.log("");

if (overdue.length) {
  console.log(`OVERDUE (${overdue.length}) — rotate now:`);
  for (const entry of overdue) console.log(line(entry, "OVERDUE"));
  console.log("");
} else {
  console.log("OVERDUE (0) — nothing past its rotation date.");
  console.log("");
}

console.log(`Due soon (${dueSoon.length}) — within ${soonDays} days:`);
for (const entry of dueSoon) console.log(line(entry, "SOON"));
console.log("");

console.log(`OK (${ok.length}):`);
for (const entry of ok) console.log(line(entry, "OK"));
console.log("");

console.log(`Untracked (${untracked.length}) — no next-rotation date set:`);
for (const entry of untracked) {
  const rotated = entry.rotated ? ` (rotated ${entry.rotated})` : "";
  console.log(`  UNTRACKED ${entry.name}${rotated}`);
}
console.log("");

if (untracked.length > 0) {
  console.log("Note: untracked secrets never expire on their own — set a Next rotation date in SECRETS.md.");
}

process.exit(overdue.length > 0 ? 1 : 0);
