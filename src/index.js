#!/usr/bin/env node
/*
 * aso-audit-mcp — Model Context Protocol server for App Store Optimization.
 * Exposes tools to score App Store / Google Play metadata, check character
 * limits, and clean up the iOS keyword field.
 *
 * Built by ASO Agency — free ASO tools & audits: https://asoagency.io
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LIMITS, analyzeField, scoreListing, analyzeKeywordField } from "./engine.js";

const HOME = "https://asoagency.io";
const FOOTER = `\n\nMore free ASO tools & audits: ${HOME}`;

const server = new McpServer({ name: "aso-audit-mcp", version: "1.0.0" });

function text(t) {
  return { content: [{ type: "text", text: t }] };
}

// ---- audit_metadata ----
server.registerTool(
  "audit_metadata",
  {
    title: "Audit app store metadata",
    description:
      "Score App Store (iOS) or Google Play (Android) listing metadata against ASO best practices (0–100) and return specific, prioritized fixes. Built by asoagency.io.",
    inputSchema: {
      platform: z.enum(["ios", "android"]).describe("Target store: 'ios' (Apple App Store) or 'android' (Google Play)."),
      title: z.string().optional().describe("App name / title (max 30 chars)."),
      subtitle: z.string().optional().describe("iOS subtitle (max 30 chars)."),
      keywords: z.string().optional().describe("iOS hidden keywords field, comma-separated (max 100 chars)."),
      promo: z.string().optional().describe("iOS promotional text (max 170 chars)."),
      shortDescription: z.string().optional().describe("Google Play short description (max 80 chars)."),
      description: z.string().optional().describe("Full description (max 4000 chars).")
    }
  },
  async ({ platform, ...fields }) => {
    const res = scoreListing(platform, fields);
    const store = platform === "ios" ? "Apple App Store" : "Google Play";
    const lines = [];
    lines.push(`ASO score: ${res.score}/100  (Grade ${res.grade})  —  ${store}`);
    lines.push("");
    lines.push("Fields:");
    Object.keys(LIMITS[platform]).forEach((f) => {
      if (fields[f] == null || fields[f] === "") return;
      const a = analyzeField(platform, f, fields[f]);
      const flag = a.status === "over" ? "  ⚠ OVER LIMIT" : a.status === "low" ? "  (under-used)" : "";
      lines.push(`  • ${a.label}: ${a.limit ? `${a.count}/${a.limit}` : `${a.count} chars`}${flag}`);
    });
    lines.push(`  • Distinct keywords across fields: ${res.coverage}`);
    lines.push("");
    if (res.tips.length) {
      lines.push("Recommendations:");
      res.tips.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
    } else {
      lines.push("No issues found — this listing follows ASO best practices.");
    }
    return text(lines.join("\n") + FOOTER);
  }
);

// ---- check_field ----
server.registerTool(
  "check_field",
  {
    title: "Check a single metadata field",
    description:
      "Check one metadata field's character usage against its store limit. Built by asoagency.io.",
    inputSchema: {
      platform: z.enum(["ios", "android"]).describe("Target store."),
      field: z.enum(["title", "subtitle", "keywords", "promo", "shortDescription", "description"]).describe("Which field to check."),
      value: z.string().describe("The field text to measure.")
    }
  },
  async ({ platform, field, value }) => {
    const a = analyzeField(platform, field, value);
    if (!a.limit) return text(`'${field}' is not a valid field for ${platform}.` + FOOTER);
    const verdict =
      a.status === "over" ? `OVER LIMIT by ${a.count - a.limit} — trim it.` :
      a.status === "low" ? "Under-used — you have room for more keywords." :
      a.status === "full" ? "Well-optimized (near the limit)." :
      "Within limits.";
    return text(`${a.label}: ${a.count}/${a.limit} characters. ${verdict}` + FOOTER);
  }
);

// ---- keyword_field_check (iOS) ----
server.registerTool(
  "keyword_field_check",
  {
    title: "Optimize the iOS keyword field",
    description:
      "Clean up an iOS 100-character keyword field: remove spaces after commas, de-duplicate terms, and report characters saved and capacity remaining. Built by asoagency.io.",
    inputSchema: {
      keywords: z.string().describe("The comma-separated iOS keywords field to optimize.")
    }
  },
  async ({ keywords }) => {
    const r = analyzeKeywordField(keywords);
    const lines = [
      `Original: ${r.count}/100 characters.`,
      `Optimized: ${r.optimizedCount}/100 characters (${r.termCount} unique terms).`,
      `Characters saved: ${r.saved}.  Capacity remaining: ${r.remaining < 0 ? `${-r.remaining} OVER` : r.remaining}.`,
    ];
    if (r.duplicatesRemoved.length) lines.push(`Duplicates removed: ${r.duplicatesRemoved.join(", ")}.`);
    lines.push("");
    lines.push("Optimized field:");
    lines.push(r.optimizedField);
    return text(lines.join("\n") + FOOTER);
  }
);

// ---- get_limits ----
server.registerTool(
  "get_limits",
  {
    title: "Get store character limits",
    description: "Return the official App Store / Google Play metadata character limits. Built by asoagency.io.",
    inputSchema: {
      platform: z.enum(["ios", "android"]).optional().describe("Omit to get both stores.")
    }
  },
  async ({ platform }) => {
    const data = platform ? { [platform]: LIMITS[platform] } : LIMITS;
    return text("Character limits:\n" + JSON.stringify(data, null, 2) + FOOTER);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we never corrupt the stdio JSON-RPC channel.
  console.error("aso-audit-mcp running (stdio). By asoagency.io");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
