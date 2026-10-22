const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 42;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

type FontId = "F1" | "F2";

type DrawOp = {
  x: number;
  y: number;
  size: number;
  font: FontId;
  text: string;
};

export type PdfSection = {
  heading?: string;
  intro?: string;
  rows?: { label: string; value: string }[];
  records?: { title: string; lines: string[] }[];
  empty?: string;
};

function toWinAnsi(text: string) {
  const map: Record<string, string> = {
    "\u2013": "-",
    "\u2014": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2026": "...",
    "\u00a0": " ",
    "\u00b7": "-",
    "\u2192": "->",
  };
  return Array.from(text)
    .map((ch) => {
      if (map[ch]) return map[ch];
      const code = ch.charCodeAt(0);
      if (code === 9) return " ";
      if (code === 10 || code === 13) return ch;
      if (code < 32) return "";
      if (code < 128 || code <= 255) return ch;
      return "?";
    })
    .join("");
}

function pdfEscape(text: string) {
  return toWinAnsi(text).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapLine(text: string, fontSize: number): string[] {
  const cleaned = toWinAnsi(text).replaceAll("\r", "").replaceAll("\t", " ");
  const maxChars = Math.max(18, Math.floor(CONTENT_W / (fontSize * 0.5)));
  const out: string[] = [];
  for (const paragraph of cleaned.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let current = "";
    const pushLong = (token: string) => {
      for (let i = 0; i < token.length; i += maxChars) {
        const chunk = token.slice(i, i + maxChars);
        if (chunk.length === maxChars) out.push(chunk);
        else current = chunk;
      }
    };
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
        continue;
      }
      if (current) out.push(current);
      if (word.length > maxChars) {
        current = "";
        pushLong(word);
      } else {
        current = word;
      }
    }
    if (current) out.push(current);
  }
  return out.length ? out : [""];
}

function pad10(n: number) {
  return String(n).padStart(10, "0");
}

export function buildPdf(input: {
  title: string;
  subtitle: string;
  generated: string;
  version: string;
  sections: PdfSection[];
}): Uint8Array {
  const pages: DrawOp[][] = [];
  let ops: DrawOp[] = [];
  let y = PAGE_H - MARGIN_TOP;

  function newPage() {
    if (ops.length) pages.push(ops);
    ops = [];
    y = PAGE_H - MARGIN_TOP;
    ops.push({
      x: MARGIN_X,
      y,
      size: 9,
      font: "F2",
      text: pages.length === 0 ? input.title : `${input.title} (continued)`,
    });
    y -= 12;
    ops.push({
      x: MARGIN_X,
      y,
      size: 8,
      font: "F1",
      text: `${input.subtitle}  |  ${input.generated}  |  v${input.version}`,
    });
    y -= 16;
    ops.push({
      x: MARGIN_X,
      y,
      size: 8,
      font: "F1",
      text: "Field Test Operations Dashboard",
    });
    y -= 18;
  }

  function ensure(space: number) {
    if (y - space < MARGIN_BOTTOM) newPage();
  }

  function write(text: string, size: number, font: FontId, gap: number) {
    for (const line of wrapLine(text, size)) {
      ensure(gap);
      ops.push({ x: MARGIN_X, y, size, font, text: line || " " });
      y -= gap;
    }
  }

  newPage();

  for (const section of input.sections) {
    if (section.heading) {
      y -= 6;
      write(section.heading, 13, "F2", 16);
    }
    if (section.intro) write(section.intro, 10, "F1", 13);
    if (section.empty) write(section.empty, 10, "F1", 13);
    if (section.rows?.length) {
      for (const row of section.rows) {
        write(`${row.label}:  ${row.value || "—"}`, 10, "F1", 13);
      }
    }
    if (section.records?.length) {
      for (const record of section.records) {
        y -= 4;
        write(record.title, 11, "F2", 14);
        if (record.lines.length === 0) write("No further detail.", 10, "F1", 13);
        for (const line of record.lines) write(line, 10, "F1", 13);
      }
    }
  }

  if (ops.length) pages.push(ops);

  const pageCount = pages.length;
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageIds = pages.map((_, index) => 3 + index);
  const fontRegularId = 3 + pages.length;
  const fontBoldId = fontRegularId + 1;
  const contentStart = fontBoldId + 1;

  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`
  );

  const contentStreams = pages.map((pageOps, pageIndex) => {
    const commands = [
      "BT",
      ...pageOps.flatMap((op) => [
        `/${op.font} ${op.size} Tf`,
        `1 0 0 1 ${op.x.toFixed(2)} ${op.y.toFixed(2)} Tm`,
        `(${pdfEscape(op.text)}) Tj`,
      ]),
      `/F1 8 Tf`,
      `1 0 0 1 ${MARGIN_X.toFixed(2)} 24 Tm`,
      `(${pdfEscape(`Page ${pageIndex + 1} of ${pageCount}`)}) Tj`,
      "ET",
    ];
    return commands.join("\n");
  });

  pages.forEach((_, index) => {
    const contentId = contentStart + index;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`
    );
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );

  for (const stream of contentStreams) {
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets = [0];
  let cursor = 0;

  function push(text: string) {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    cursor += bytes.length;
  }

  push("%PDF-1.4\n");
  objects.forEach((body, index) => {
    offsets[index + 1] = cursor;
    push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefAt = cursor;
  push(`xref\n0 ${objects.length + 1}\n`);
  push("0000000000 65535 f \n");
  for (let i = 1; i <= objects.length; i++) {
    push(`${pad10(offsets[i])} 00000 n \n`);
  }
  push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(cursor);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function downloadPdf(filename: string, bytes: Uint8Array) {
  const copy = Uint8Array.from(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
