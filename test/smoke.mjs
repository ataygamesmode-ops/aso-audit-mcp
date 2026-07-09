/* Engine smoke test (no MCP SDK needed). Run: npm test */
import assert from "node:assert";
import { scoreListing, analyzeField, analyzeKeywordField } from "../src/engine.js";

let pass = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  pass++;
  console.log("  ✓ " + name);
}

const weak = scoreListing("ios", { title: "MyApp" });
ok("weak listing scores low", weak.score < 40 && weak.grade === "F");
ok("weak listing yields tips", weak.tips.length >= 3);

const strong = scoreListing("ios", {
  title: "Habit Tracker: Daily Goals",
  subtitle: "Routine planner & streak coach",
  keywords: "habit,routine,streak,goal,planner,daily,reminder,tracker,productivity",
  description: "x".repeat(1200)
});
ok("strong listing scores high", strong.score >= 85 && ["A", "B"].includes(strong.grade));

const over = analyzeField("ios", "title", "x".repeat(35));
ok("over-limit field flagged", over.status === "over" && over.count === 35);

const kw = analyzeKeywordField("habit, habit,routine, goal");
ok("keyword field dedupes", kw.termCount === 3 && kw.duplicatesRemoved.includes("habit"));
ok("keyword field saves chars", kw.saved > 0 && kw.optimizedField === "habit,routine,goal");

console.log(`\n${pass} checks passed.`);
