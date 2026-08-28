import assert from "node:assert/strict";
import { formatMenuPrice } from "../src/lib/price.ts";

assert.equal(formatMenuPrice(14), "14");
assert.equal(formatMenuPrice("14.00", "$"), "$14.00");
assert.equal(formatMenuPrice("$14.00", "$"), "$14.00");
assert.equal(formatMenuPrice("US$14.00"), "US$14.00");
assert.equal(formatMenuPrice("14€"), "€14");
assert.equal(formatMenuPrice("10", "￥"), "￥10");
assert.equal(formatMenuPrice("10", "USD"), "10");

console.log("Menu price formatting checks passed.");
