import "server-only";
// rebuild landing from current index.html (cache-bust 2026-10-18)

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface LegacyLanding {
  body: string;
  script: string;
  styles: string;
}

export function readLegacyLanding(): LegacyLanding {
  const source = readFileSync(join(process.cwd(), "index.html"), "utf8");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  const styles = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");

  if (!body || !styles) {
    throw new Error("The preserved landing page is missing its body or styles.");
  }

  const scripts = [...body.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  const script = scripts.map((match) => match[1]).join("\n");
  const bodyWithoutScripts = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  return { body: bodyWithoutScripts, script, styles };
}
