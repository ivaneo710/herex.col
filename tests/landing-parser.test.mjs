import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the preserved landing page routes pricing choices to the React checkout", () => {
  const source = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(source, /id="precios"/);
  assert.match(source, /href="\/checkout\?plan=essential"/);
  assert.match(source, /href="\/checkout\?plan=growth"/);
  assert.match(source, /href="\/checkout\?plan=impact"/);
  assert.match(source, /href="\/checkout"/);
  assert.doesNotMatch(source, /id="checkout-form"/);
  assert.doesNotMatch(source, /id="payment-modal"/);
});
