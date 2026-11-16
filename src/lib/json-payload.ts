/** ExtendsClass sometimes appends an HTML page after the JSON body. */
export function parseJsonPayload(text: string): unknown {
  const start = text.search(/[\[{]/);
  if (start < 0) {
    throw new SyntaxError("The shared list did not return JSON.");
  }
  const source = text.slice(start);
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(0, i + 1));
    }
  }
  return JSON.parse(source);
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  return parseJsonPayload(await response.text());
}
