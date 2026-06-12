import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type CompanyState, wcfo, wcfoStrict } from "./wcfo";

const golden = JSON.parse(
  readFileSync(join(__dirname, "../../data/fixtures/golden.json"), "utf8"),
);

// At the baseline date the live delta is zero by construction.
const companies: Record<string, CompanyState> = Object.fromEntries(
  Object.entries(golden.companies).map(([t, c]) => [
    t,
    { bessembinderWcUsd: (c as { cwc_usd: number }).cwc_usd, capNowUsd: 0, capBaselineUsd: 0 },
  ]),
);

describe("golden fixture reproduction (same truth as pytest)", () => {
  for (const [slug, f] of Object.entries(golden.founders) as [string, {
    weights: Record<string, number>; kept_usd: number; wcfo_usd: number;
  }][]) {
    it(slug, () => {
      expect(wcfo(f.weights, companies, f.kept_usd)).toBeCloseTo(f.wcfo_usd, 0);
    });
  }
});

it("Bezos Dec-2024 regression: within ±20% of his $2.1T claim", () => {
  const v = wcfo({ AMZN: 1 }, { AMZN: { bessembinderWcUsd: 2.154e12, capNowUsd: 0, capBaselineUsd: 0 } }, 233489.254e6);
  expect(v).toBeGreaterThan(1.7e12);
  expect(v).toBeLessThan(2.5e12);
});

it("live delta moves CWC", () => {
  const v = wcfo({ X: 1 }, { X: { bessembinderWcUsd: 2e12, capNowUsd: 2.5e12, capBaselineUsd: 2.3e12 } }, 0);
  expect(v).toBeCloseTo(2.2e12, -9);
});

it("strict variant subtracts lifetime giving", () => {
  const c = { X: { bessembinderWcUsd: 2e12, capNowUsd: 0, capBaselineUsd: 0 } };
  expect(wcfoStrict({ X: 1 }, c, 0.2e12, 0.1e12)).toBeCloseTo(wcfo({ X: 1 }, c, 0.2e12) - 0.1e12, -6);
});

it("negative WCFO is not clamped", () => {
  expect(wcfo({ SNAP: 1 }, { SNAP: { bessembinderWcUsd: -30e9, capNowUsd: 0, capBaselineUsd: 0 } }, 3e9)).toBeCloseTo(-33e9, -6);
});
