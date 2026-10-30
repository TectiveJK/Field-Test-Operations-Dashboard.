import { todayIso } from "@/lib/format";
import {
  asReporterStore,
  isEmptyReporterDraft,
  type ReporterFlight,
  type ReporterStore,
} from "@/lib/reporter-import";

const RESULTS = ["Pass with observations", "Pass", "Fail", "Aborted", "Pending"] as const;
const RESULT_PATTERN = RESULTS.map((item) => item.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const FLIGHT_HEADING = new RegExp(
  `(?:^|\\n)\\s*Flight\\s+(\\d+)\\s*[\\u2014\\u2013-]\\s*(${RESULT_PATTERN})\\b`,
  "gi"
);

const FIELD_LABELS = [
  "Car / Van plate No.",
  "Test Objective Type",
  "Location",
  "Responsible",
  "Robotics & Software",
  "Robotics",
  "UAV / Aircraft Category",
  "UAV Category",
  "Equipment",
  "Weather",
  "Flight Date & Time",
  "Date / Time",
  "Flight Date",
  "Date",
  "Flight Duration",
  "Duration",
  "Flight Modes",
  "Flight log",
  "Flight Log",
  "Wireshark capture",
  "Wireshark",
  "Attachments",
];

function grab(block: string, label: string) {
  const escaped = label.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const others = FIELD_LABELS.filter((item) => item.toLowerCase() !== label.toLowerCase())
    .map((item) => item.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const match = block.match(
    new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\s*(?:${others}):|\\n\\s*Flight\\s+\\d+|\\n\\n|$)`, "i")
  );
  return (match?.[1] || "").replace(/\s+/g, " ").trim();
}

function section(block: string, heading: string) {
  const escaped = heading.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(
    new RegExp(
      `${escaped}\\s*(?:\\n|:)?\\s*([\\s\\S]*?)(?=\\s*(?:Mission|Anomal|Immediate|Evidence|Conclusion|Flight\\s+\\d+)|$)`,
      "i"
    )
  );
  return (match?.[1] || "").trim();
}

function asResult(raw: string) {
  const value = raw.replace(/\s+/g, " ").trim();
  return (
    RESULTS.find((item) => value.toLowerCase().startsWith(item.toLowerCase())) ?? "Pending"
  );
}

function equipmentOf(raw: string) {
  if (!raw || raw === "N/A") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "N/A");
}

function modesOf(raw: string) {
  if (!raw || raw === "N/A") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "N/A");
}

function clean(value: string) {
  const text = value.replace(/\r/g, "").replace(/\s+/g, " ").trim();
  if (!text || /^(N\/A|None|None reported)$/i.test(text)) return "";
  return text;
}

function fileBase(value: string) {
  if (!value || value === "None") return "";
  return value.split(/[/\\]/).pop()?.replace(/^evidence\//, "") || value;
}

function cleanBlock(value: string) {
  const text = value.replace(/\r/g, "").trim();
  if (!text || /^(N\/A|None|None reported)$/i.test(text)) return "";
  return text;
}

function parseJsonStore(text: string): ReporterStore | null {
  try {
    return asReporterStore(JSON.parse(text));
  } catch {
    return null;
  }
}

function normalizeExport(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\u2014/g, "—")
    .replace(/\u2013/g, "—")
    .replace(/\s+Flight\s+(\d+)\s+—/g, "\nFlight $1 —")
    .replace(/\s+Conclusion\s+/g, "\nConclusion\n")
    .replace(/\s+Mission\s+/g, "\nMission\n")
    .replace(/\s+Evidence\s+/g, "\nEvidence\n")
    .replace(/\s+Anomalies \/ Bugs\/Immediate Action\s+/g, "\nAnomalies / Bugs/Immediate Action\n");
}

function parsePreview(text: string): ReporterStore | null {
  const normalized = normalizeExport(text);
  if (!/Drone Flight Test Report/i.test(normalized) && !/Flight\s+\d+\s+—/i.test(normalized)) {
    return null;
  }
  const flightStarts = [...normalized.matchAll(new RegExp(FLIGHT_HEADING.source, "gi"))];
  if (!flightStarts.length) return null;
  const header = normalized.slice(0, flightStarts[0].index);
  const conclusionMatch = normalized.split(/^Conclusion\s*$/im).at(-1) || "";
  const conclusion = cleanBlock(
    conclusionMatch
      .replace(/Overall Result:.*$/gim, "")
      .replace(/Overall test result:\s*/i, "")
      .trim()
  );
  const types = grab(header, "Test Objective Type");
  const [objectiveType, objectiveType2] = types
    .split("/")
    .map((item) => item.trim())
    .filter((item) => item && item !== "N/A");
  const shared = {
    vehiclePlate: clean(grab(header, "Car / Van plate No.")),
    objectiveType: objectiveType || "",
    objectiveType2: objectiveType2 || "",
    objective: cleanBlock(
      header.match(
        /Test Objective(?!\s*Type)\s*(?:\n|:)\s*([\s\S]*?)(?=\s*(?:Location|Responsible|Car \/ Van|Test Objective Type|Flight\s+\d+)|$)/i
      )?.[1] || ""
    ),
    location: clean(grab(header, "Location")),
    operator: clean(grab(header, "Responsible")),
    observer: clean(grab(header, "Robotics & Software").replace(/^Robotics:\s*/i, "")),
    category: clean(
      grab(header, "UAV Category").replace(/^UAV \/ Aircraft Category:\s*/i, "") ||
        grab(header, "UAV / Aircraft Category")
    ),
    weather: clean(grab(header, "Weather")),
  };
  const flights: ReporterFlight[] = flightStarts.map((match, index) => {
    const start = match.index ?? 0;
    const end = flightStarts[index + 1]?.index ?? normalized.search(/^Conclusion\s*$/im);
    const block = normalized.slice(start, end < 0 ? undefined : end);
    const result = asResult(match[2] || "");
    const duration = clean(grab(block, "Duration").replace(/^Flight Duration:\s*/i, ""));
    const date =
      grab(block, "Flight Date & Time") ||
      grab(block, "Date / Time") ||
      grab(block, "Date") ||
      grab(block, "Flight Date");
    const dateTime = date.replace(/\s+Duration:.*$/, "").trim();
    const anomalies = cleanBlock(
      section(block, "Anomalies / Bugs/Immediate Action") || section(block, "Anomaly / Bug")
    );
    const action = cleanBlock(section(block, "Immediate Action"));
    const log = fileBase(
      clean(grab(block, "Flight log").replace(/^Flight Log:\s*/i, "").replace(/\(attached\)$/i, ""))
    );
    const pcap = fileBase(
      clean(
        (grab(block, "Wireshark capture") || grab(block, "Wireshark"))
          .replace(/^Wireshark capture:\s*/i, "")
          .replace(/\(attached\)$/i, "")
      )
    );
    const attachments = equipmentOf(clean(grab(block, "Attachments")));
    const stamp =
      dateTime && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateTime)
        ? dateTime.slice(0, 16)
        : `${todayIso()}T12:${String(index).padStart(2, "0")}`;
    return {
      number: Number(match[1]) || index + 1,
      ...shared,
      equipment: equipmentOf(grab(header, "Equipment") || grab(block, "Equipment")),
      dateTime: stamp,
      duration: duration === "N/A" ? "" : duration,
      modes: modesOf(grab(block, "Flight Modes")),
      mission: cleanBlock(section(block, "Mission")),
      anomalies:
        action && anomalies && !anomalies.includes(action) ? `${anomalies}\n\n${action}` : anomalies || action,
      action: "",
      result,
      logName: log,
      captureName: pcap,
      attachments,
    };
  });
  const store = { conclusion, flights };
  return isEmptyReporterDraft(store) ? null : store;
}

export function parseReporterExport(text: string): ReporterStore | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return parseJsonStore(trimmed) ?? parsePreview(trimmed);
}

function pdfUnescape(raw: string) {
  return raw
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\r")
    .replaceAll("\\t", "\t")
    .replaceAll("\\(", "(")
    .replaceAll("\\)", ")")
    .replaceAll("\\\\", "\\");
}

function latin1Bytes(text: string) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function stringsFromPdfStream(body: string) {
  const chunks: string[] = [];
  for (const match of body.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
    chunks.push(pdfUnescape(match[0].slice(1, -1)));
  }
  for (const match of body.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
    const hex = match[1].replace(/\s+/g, "");
    if (hex.length % 2) continue;
    let text = "";
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
    }
    if (/[\x20-\x7e]/.test(text)) chunks.push(text);
  }
  return chunks.join(" ");
}

async function inflate(bytes: Uint8Array) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("deflate");
  }
  let lastError: unknown;
  for (const format of ["deflate", "deflate-raw"] as const) {
    try {
      const copy = new Uint8Array(bytes);
      const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("deflate");
}

async function extractPdfTextNaive(bytes: Uint8Array): Promise<string> {
  const latin = new TextDecoder("latin1").decode(bytes);
  const parts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin))) {
    const header = latin.slice(Math.max(0, match.index - 220), match.index);
    let body = match[1];
    if (/\/FlateDecode/.test(header)) {
      try {
        body = new TextDecoder("latin1").decode(await inflate(latin1Bytes(match[1])));
      } catch {
        continue;
      }
    }
    const text = stringsFromPdfStream(body).trim();
    if (text) parts.push(text);
  }
  const joined = parts.join("\n").replace(/[ \t]+/g, " ").trim();
  return joined || latin;
}

async function extractPdfTextPdfJs(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  const data = new Uint8Array(bytes);
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf.worker.min.mjs`;
  } else {
    const path = await import("node:path");
    const url = await import("node:url");
    const worker = path.join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(worker).href;
  }
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line.push(item.str);
      if ("hasEOL" in item && item.hasEOL) line.push("\n");
      else line.push(" ");
    }
    pages.push(line.join("").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim());
  }
  return pages.filter(Boolean).join("\n");
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const fromPdfJs = await extractPdfTextPdfJs(bytes);
    if (fromPdfJs && /Flight\s+\d+/i.test(fromPdfJs)) return fromPdfJs;
    const naive = await extractPdfTextNaive(bytes);
    return /Flight\s+\d+/i.test(naive) ? naive : fromPdfJs || naive;
  } catch {
    return extractPdfTextNaive(bytes);
  }
}

export async function reporterStoreFromFile(file: File): Promise<ReporterStore | null> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const asText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || asText.startsWith("%PDF")) {
    return parseReporterExport(await extractPdfText(buffer));
  }
  return parseReporterExport(asText);
}
