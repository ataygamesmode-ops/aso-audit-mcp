/*
 * ASO analysis engine (ESM) — the scoring logic behind the aso-audit-mcp server.
 * Mirrors the browser-extension engine so scores are consistent across tools.
 * Zero dependencies. Free ASO tools: https://asoagency.io
 */

// Official store metadata limits (characters).
export const LIMITS = {
  ios: {
    title: 30,        // App Name
    subtitle: 30,     // Subtitle
    keywords: 100,    // Keywords field (comma separated, hidden from users)
    promo: 170,       // Promotional text
    description: 4000 // Description
  },
  android: {
    title: 30,        // Title
    shortDescription: 80,
    description: 4000 // Full description
  }
};

export const LABELS = {
  title: "Title",
  subtitle: "Subtitle",
  keywords: "Keywords",
  promo: "Promo text",
  shortDescription: "Short description",
  description: "Description"
};

function len(v) {
  return (v == null ? "" : String(v)).length;
}

export function analyzeField(platform, field, value) {
  const limit = (LIMITS[platform] || {})[field];
  const count = len(value);
  const pct = limit ? count / limit : 0;
  let status = "ok";
  if (limit && count > limit) status = "over";
  else if (limit && pct < 0.5) status = "low";
  else if (limit && pct >= 0.95) status = "full";
  return { field, label: LABELS[field] || field, count, limit: limit || 0, pct, status };
}

export function words(v) {
  return (v || "")
    .toLowerCase()
    .split(/[\s,;|]+/)
    .map((w) => w.replace(/[^a-z0-9+]/g, ""))
    .filter((w) => w.length > 1);
}

const STOP = { the: 1, and: 1, for: 1, with: 1, your: 1, you: 1, app: 1, best: 1, free: 1, new: 1, get: 1, now: 1, all: 1, our: 1 };

function uniqueKeywordCoverage(fields) {
  const set = {};
  ["title", "subtitle", "keywords", "shortDescription"].forEach((k) => {
    words(fields[k]).forEach((w) => { if (!STOP[w]) set[w] = 1; });
  });
  return Object.keys(set).length;
}

export function grade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

/* Score a full listing 0–100 with actionable tips. */
export function scoreListing(platform, fields = {}) {
  const checks = [];
  const tips = [];
  const L = LIMITS[platform] || {};

  function add(weight, pass, tip) {
    checks.push({ weight, pass: !!pass });
    if (!pass && tip) tips.push(tip);
  }

  const titleLen = len(fields.title);
  add(20, titleLen > 0 && titleLen <= L.title, titleLen === 0
    ? "Add an app title."
    : titleLen > L.title
      ? `Title is ${titleLen} chars — trim to ${L.title} or the store will truncate/reject it.`
      : null);
  add(12, titleLen >= L.title * 0.6,
    titleLen > 0 && titleLen < L.title * 0.6
      ? `Your title uses only ${titleLen}/${L.title} chars — add a high-value keyword to fill it.`
      : null);

  if (platform === "ios") {
    const subLen = len(fields.subtitle);
    add(14, subLen > 0 && subLen <= L.subtitle,
      subLen === 0 ? "Add a subtitle — it is the second-strongest ranking field on iOS." :
      subLen > L.subtitle ? `Subtitle is over ${L.subtitle} chars.` : null);
    add(8, subLen >= L.subtitle * 0.5, subLen > 0 && subLen < L.subtitle * 0.5
      ? `Subtitle only uses ${subLen}/${L.subtitle} chars — pack in more keywords.` : null);

    const kwLen = len(fields.keywords);
    add(16, kwLen > 0 && kwLen <= L.keywords,
      kwLen === 0 ? "Fill the 100-char keywords field — it is invisible to users but ranks you." :
      kwLen > L.keywords ? "Keywords field is over 100 chars and will be cut off." : null);
    add(6, kwLen >= L.keywords * 0.7, kwLen > 0 && kwLen < L.keywords * 0.7
      ? `Keywords field only uses ${kwLen}/100 chars — don't waste the space.` : null);

    if (fields.keywords && /,\s/.test(fields.keywords)) {
      tips.push("Remove spaces after commas in the keywords field — each one wastes a character.");
    }
    const titleSubWords = {};
    words(fields.title).concat(words(fields.subtitle)).forEach((w) => { titleSubWords[w] = 1; });
    const dup = words(fields.keywords).filter((w) => titleSubWords[w] && !STOP[w]);
    if (dup.length) {
      tips.push(`Keywords repeat words already in your title/subtitle (${dup.slice(0, 4).join(", ")}) — Apple indexes across fields, so replace them with new terms.`);
    }
  } else if (platform === "android") {
    const shortLen = len(fields.shortDescription);
    add(16, shortLen > 0 && shortLen <= L.shortDescription,
      shortLen === 0 ? "Add a short description (80 chars) — it shows above the fold and is indexed." :
      shortLen > L.shortDescription ? "Short description is over 80 chars." : null);
    add(6, shortLen >= L.shortDescription * 0.6, shortLen > 0 && shortLen < L.shortDescription * 0.6
      ? `Short description uses only ${shortLen}/80 chars.` : null);
  }

  const descLen = len(fields.description);
  add(12, descLen >= 500,
    descLen === 0 ? "Add a description." :
    descLen < 500 ? `Description is short (${descLen} chars) — aim for 1,000+ with your keywords used naturally.` : null);
  add(6, descLen <= L.description, descLen > L.description
    ? `Description exceeds ${L.description} chars.` : null);

  const coverage = uniqueKeywordCoverage(fields);
  add(10, coverage >= 8, coverage < 8
    ? `Only ${coverage} distinct keywords across your fields — broaden your term coverage (aim for 12+).`
    : null);

  let earned = 0, total = 0;
  checks.forEach((c) => { total += c.weight; if (c.pass) earned += c.weight; });
  const score = total ? Math.round((earned / total) * 100) : 0;

  return { score, grade: grade(score), coverage, tips };
}

/*
 * Optimize an iOS keywords field: strip spaces after commas, de-duplicate
 * (case-insensitive), and report characters saved + capacity remaining out of 100.
 */
export function analyzeKeywordField(value) {
  const raw = value || "";
  const count = raw.length;
  const seen = new Set();
  const kept = [];
  const duplicates = [];
  raw.split(",").forEach((t) => {
    const term = t.trim().toLowerCase();
    if (!term) return;
    if (seen.has(term)) { duplicates.push(term); return; }
    seen.add(term);
    kept.push(term);
  });
  const optimizedField = kept.join(",");
  const optimizedCount = optimizedField.length;
  return {
    count,
    optimizedField,
    optimizedCount,
    saved: Math.max(0, count - optimizedCount),
    remaining: 100 - optimizedCount,
    over: optimizedCount > 100,
    termCount: kept.length,
    duplicatesRemoved: duplicates
  };
}
