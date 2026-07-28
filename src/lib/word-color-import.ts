import JSZip from "jszip";
import { HIGHLIGHT_PINK, TEXT_BLUE, TEXT_RED } from "@/lib/editor-palette";

// Carries Word's colours through the import onto the editor's fixed palette.
//
// Mammoth reads a run's highlight (w:highlight) but NEVER reads its font colour
// (w:color) — see readRunProperties in mammoth/lib/docx/body-reader.js — so no
// style map or transformDocument hook can see red/blue text. The workaround is
// to rewrite the .docx before conversion: every coloured run gets a named
// character style, which mammoth DOES read, and a style map turns that style
// into a span the post-conversion pass paints with the palette value.
//
// Word's own colours are deliberately not preserved verbatim. Authors pick from
// Word's palette (and its highlighter has no pink at all), so anything
// recognisably red becomes TEXT_RED, anything blue becomes TEXT_BLUE, and every
// highlight becomes HIGHLIGHT_PINK. The article then uses only the three values
// the toolbar can produce.

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DOCUMENT_PATH = "word/document.xml";
const STYLES_PATH = "word/styles.xml";

const RED_RUN_STYLE_ID = "SiteImportRedText";
const BLUE_RUN_STYLE_ID = "SiteImportBlueText";
const RED_CLASS = "word-import-red";
const BLUE_CLASS = "word-import-blue";

// Appended to mammoth's default style map, so headings/lists/tables keep
// converting exactly as before.
export const WORD_COLOR_STYLE_MAP = [
  `r.${RED_RUN_STYLE_ID} => span.${RED_CLASS}`,
  `r.${BLUE_RUN_STYLE_ID} => span.${BLUE_CLASS}`,
  "highlight => mark",
];

export type ImportedTextColor = "red" | "blue";

// Word's palette holds several reds and blues (FF0000, C00000, 4472C4, …) and an
// author may pick any of them, so classify by hue rather than matching exact
// values. Everything else — greens, oranges, purples, greys, automatic/black
// body text — is left uncoloured rather than forced into the two-colour palette.
const RED_MAX_HUE = 20;
const RED_MIN_HUE = 340;
const BLUE_MIN_HUE = 195;
const BLUE_MAX_HUE = 270;
// Below these a colour is a grey or near-black, i.e. ordinary body text.
const MIN_CHROMA = 40;
const MIN_BRIGHTNESS = 60;

export function classifyWordColor(
  value: string | null | undefined,
): ImportedTextColor | null {
  if (!value) {
    return null;
  }

  // Also rejects w:val="auto", Word's "automatic" (theme-derived) colour.
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  if (chroma < MIN_CHROMA || max < MIN_BRIGHTNESS) {
    return null;
  }

  const hue = hueOf(r, g, b, max, chroma);
  if (hue <= RED_MAX_HUE || hue >= RED_MIN_HUE) {
    return "red";
  }
  if (hue >= BLUE_MIN_HUE && hue <= BLUE_MAX_HUE) {
    return "blue";
  }
  return null;
}

function hueOf(
  r: number,
  g: number,
  b: number,
  max: number,
  chroma: number,
): number {
  let hue: number;
  if (max === r) {
    hue = 60 * ((g - b) / chroma);
  } else if (max === g) {
    hue = 60 * ((b - r) / chroma + 2);
  } else {
    hue = 60 * ((r - g) / chroma + 4);
  }
  return ((hue % 360) + 360) % 360;
}

// Returns a .docx whose coloured runs carry one of our character styles. On any
// problem the original buffer comes back unchanged, so a document we can't
// rewrite still imports with its text intact, just without colour.
export async function tagColoredRuns(docx: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(docx);
    const documentEntry = zip.file(DOCUMENT_PATH);
    if (!documentEntry) {
      return docx;
    }

    const patched = patchRunStyles(await documentEntry.async("string"));
    if (!patched.changed) {
      return docx;
    }
    zip.file(DOCUMENT_PATH, patched.xml);

    // Declaring the styles keeps mammoth from reporting them as unrecognised.
    const stylesEntry = zip.file(STYLES_PATH);
    if (stylesEntry) {
      zip.file(
        STYLES_PATH,
        declareRunStyles(await stylesEntry.async("string")),
      );
    }

    return await zip.generateAsync({ type: "arraybuffer" });
  } catch {
    return docx;
  }
}

function patchRunStyles(xml: string): { xml: string; changed: boolean } {
  const doc = parseXml(xml);
  if (!doc) {
    return { xml, changed: false };
  }

  let changed = false;
  for (const runProps of Array.from(doc.getElementsByTagName("w:rPr"))) {
    // A run that already has a character style keeps it — that style may be
    // mapped to something meaningful (Strong, Emphasis) and only one w:rStyle
    // is allowed per run.
    if (runProps.getElementsByTagName("w:rStyle").length > 0) {
      continue;
    }

    const color = runProps.getElementsByTagName("w:color")[0];
    const kind = classifyWordColor(color?.getAttribute("w:val"));
    if (!kind) {
      continue;
    }

    const runStyle = doc.createElementNS(W_NS, "w:rStyle");
    runStyle.setAttributeNS(
      W_NS,
      "w:val",
      kind === "red" ? RED_RUN_STYLE_ID : BLUE_RUN_STYLE_ID,
    );
    // The OOXML schema requires w:rStyle to be the first child of w:rPr.
    runProps.insertBefore(runStyle, runProps.firstChild);
    changed = true;
  }

  return { xml: serializeXml(doc), changed };
}

function declareRunStyles(xml: string): string {
  const doc = parseXml(xml);
  const root = doc?.documentElement;
  if (!doc || !root) {
    return xml;
  }

  const existing = new Set(
    Array.from(doc.getElementsByTagName("w:style")).map((style) =>
      style.getAttribute("w:styleId"),
    ),
  );

  for (const [styleId, name] of [
    [RED_RUN_STYLE_ID, "Site Import Red Text"],
    [BLUE_RUN_STYLE_ID, "Site Import Blue Text"],
  ]) {
    if (existing.has(styleId)) {
      continue;
    }
    const style = doc.createElementNS(W_NS, "w:style");
    style.setAttributeNS(W_NS, "w:type", "character");
    style.setAttributeNS(W_NS, "w:styleId", styleId);
    const nameElement = doc.createElementNS(W_NS, "w:name");
    nameElement.setAttributeNS(W_NS, "w:val", name);
    style.appendChild(nameElement);
    root.appendChild(style);
  }

  return serializeXml(doc);
}

function parseXml(xml: string): Document | null {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return doc.getElementsByTagName("parsererror").length > 0 ? null : doc;
}

function serializeXml(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

// Turns the marker spans and mammoth's bare <mark> elements into the same
// markup the toolbar writes, so TipTap parses them back into Color and
// Highlight marks and the public page renders them like any authored colour.
export function applyImportedColors(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  paintTextColor(doc, RED_CLASS, TEXT_RED);
  paintTextColor(doc, BLUE_CLASS, TEXT_BLUE);

  doc.body.querySelectorAll("mark").forEach((element) => {
    element.setAttribute("data-color", HIGHLIGHT_PINK);
    element.setAttribute(
      "style",
      `background-color: ${HIGHLIGHT_PINK}; color: inherit`,
    );
  });

  return doc.body.innerHTML;
}

function paintTextColor(doc: Document, className: string, color: string): void {
  doc.body.querySelectorAll(`span.${className}`).forEach((element) => {
    element.classList.remove(className);
    if (element.classList.length === 0) {
      element.removeAttribute("class");
    }
    element.setAttribute("style", `color: ${color}`);
  });
}
