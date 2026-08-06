import JSZip from "jszip";
import { WORD_NUMBERED_LIST_CLASS } from "@/lib/constants";

// Carries Word's own list numbering through the import.
//
// Mammoth reads word/numbering.xml only far enough to decide "bullet or
// ordered" — it turns every ordered list into a plain <ol>, discarding the
// level's number format and its label template. A Word list numbered (a), (b),
// (c) therefore arrives as <ol><li>, which the browser renders 1. 2. 3.
//
// Worse, the counter restarts. Word keeps one counter per list, so items stay in
// sequence even when other paragraphs sit between them; in HTML each run of
// consecutive <li> becomes its own <ol> starting again at 1. An interrupted list
// comes out as "1." … "1." … "1.".
//
// Rather than try to rebuild <ol type>/<ol start> — which sanitize-html strips
// and the article stylesheet overrides with list-style: decimal — this resolves
// each item's label exactly as Word would render it and writes it into the item
// as text: <ol><li>(a) …</li></ol>. The list structure is kept, so items keep
// list spacing and indentation rather than picking up paragraph margins.
//
// Because the label is now part of the text, the browser's own marker would
// duplicate it ("1. (a) …"). markWordOrderedLists tags each converted <ol> so
// the stylesheet can drop the marker for these lists only, leaving lists written
// in the editor with their normal numbering.
//
// Bulleted lists are left completely alone: mammoth's <ul> is already right.

const DOCUMENT_PATH = "word/document.xml";
const NUMBERING_PATH = "word/numbering.xml";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

// Formats that render no marker at all, so the paragraph is left untouched.
const UNMARKED_FORMATS = new Set(["bullet", "none"]);

interface LevelDefinition {
  numFmt: string;
  lvlText: string;
  start: number;
}

/** ilvl -> definition, for one abstract numbering definition. */
type AbstractLevels = Map<number, LevelDefinition>;

interface NumberingDefinitions {
  /** numId -> its levels, with any per-instance start overrides applied. */
  byNumId: Map<string, AbstractLevels>;
}

function attr(element: Element, name: string): string | null {
  // Word writes these attributes namespace-prefixed; look the prefixed name up
  // directly, matching how the rest of the docx pre-processing reads the XML.
  return element.getAttribute(name);
}

function firstChild(parent: Element, tag: string): Element | null {
  const found = parent.getElementsByTagName(tag);
  return found.length > 0 ? found[0] : null;
}

function levelValue(level: Element, tag: string): string | null {
  const node = firstChild(level, tag);
  return node ? attr(node, "w:val") : null;
}

function parseLevels(container: Element): AbstractLevels {
  const levels: AbstractLevels = new Map();

  for (const level of Array.from(container.getElementsByTagName("w:lvl"))) {
    const ilvl = Number(attr(level, "w:ilvl"));
    if (!Number.isInteger(ilvl)) {
      continue;
    }
    levels.set(ilvl, {
      numFmt: levelValue(level, "w:numFmt") ?? "decimal",
      lvlText: levelValue(level, "w:lvlText") ?? "%1.",
      start: Number(levelValue(level, "w:start") ?? "1") || 1,
    });
  }

  return levels;
}

function parseNumbering(doc: Document): NumberingDefinitions {
  const abstracts = new Map<string, AbstractLevels>();
  for (const abstract of Array.from(
    doc.getElementsByTagName("w:abstractNum"),
  )) {
    const id = attr(abstract, "w:abstractNumId");
    if (id) {
      abstracts.set(id, parseLevels(abstract));
    }
  }

  const byNumId = new Map<string, AbstractLevels>();
  for (const num of Array.from(doc.getElementsByTagName("w:num"))) {
    const numId = attr(num, "w:numId");
    const abstractId = levelValue(num, "w:abstractNumId");
    if (!numId || !abstractId) {
      continue;
    }

    const base = abstracts.get(abstractId);
    if (!base) {
      continue;
    }

    // A list instance may restart a level at its own number.
    const levels: AbstractLevels = new Map(base);
    for (const override of Array.from(num.getElementsByTagName("w:lvlOverride"))) {
      const ilvl = Number(attr(override, "w:ilvl"));
      const startOverride = levelValue(override, "w:startOverride");
      const existing = levels.get(ilvl);
      if (existing && startOverride !== null) {
        levels.set(ilvl, {
          ...existing,
          start: Number(startOverride) || existing.start,
        });
      }
    }

    byNumId.set(numId, levels);
  }

  return { byNumId };
}

// a…z, then aa, ab, … — Word's own lettering.
function toLetters(value: number): string {
  let n = value;
  let out = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    out = String.fromCharCode(97 + remainder) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out || "a";
}

const ROMAN: ReadonlyArray<[number, string]> = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

function toRoman(value: number): string {
  let n = value;
  let out = "";
  for (const [amount, numeral] of ROMAN) {
    while (n >= amount) {
      out += numeral;
      n -= amount;
    }
  }
  return out || "i";
}

function formatCounter(value: number, numFmt: string): string {
  switch (numFmt) {
    case "lowerLetter":
      return toLetters(value);
    case "upperLetter":
      return toLetters(value).toUpperCase();
    case "lowerRoman":
      return toRoman(value);
    case "upperRoman":
      return toRoman(value).toUpperCase();
    case "decimalZero":
      return String(value).padStart(2, "0");
    default:
      // decimal and everything unrecognised (ordinal, cardinalText, …) fall
      // back to the plain number, which is what mammoth would have shown.
      return String(value);
  }
}

/**
 * Renders a level's label template. `%1`–`%9` refer to the counters of levels
 * 1–9, so a nested level can print "1.a" or "(a)(i)".
 */
function renderLabel(
  template: string,
  counters: Map<number, number>,
  levels: AbstractLevels,
): string {
  return template.replace(/%([1-9])/g, (_match, digit: string) => {
    const ilvl = Number(digit) - 1;
    const level = levels.get(ilvl);
    const value = counters.get(ilvl) ?? level?.start ?? 1;
    return formatCounter(value, level?.numFmt ?? "decimal");
  });
}

function numberingOf(
  paragraph: Element,
): { numId: string; ilvl: number } | null {
  const numPr = firstChild(paragraph, "w:numPr");
  if (!numPr) {
    return null;
  }

  const numId = levelValue(numPr, "w:numId");
  if (!numId) {
    return null;
  }

  return { numId, ilvl: Number(levelValue(numPr, "w:ilvl") ?? "0") || 0 };
}

// The label becomes a run at the very start of the paragraph. w:pPr must stay
// the first child of w:p, so the run goes immediately after it.
function prependLabelRun(
  doc: Document,
  paragraph: Element,
  label: string,
): void {
  const run = doc.createElementNS(W_NS, "w:r");
  const text = doc.createElementNS(W_NS, "w:t");
  // The trailing space separates the label from the text and must survive.
  text.setAttributeNS(XML_NS, "xml:space", "preserve");
  text.appendChild(doc.createTextNode(`${label} `));
  run.appendChild(text);

  const props = firstChild(paragraph, "w:pPr");
  if (props && props.parentNode === paragraph) {
    paragraph.insertBefore(run, props.nextSibling);
  } else {
    paragraph.insertBefore(run, paragraph.firstChild);
  }
}

function rewriteDocument(
  documentXml: string,
  numbering: NumberingDefinitions,
): { xml: string; changed: boolean } {
  const doc = parseXml(documentXml);
  if (!doc) {
    return { xml: documentXml, changed: false };
  }

  // One counter set per list instance, walked in document order so an
  // interrupted list keeps counting instead of restarting.
  const counters = new Map<string, Map<number, number>>();
  let changed = false;

  for (const paragraph of Array.from(doc.getElementsByTagName("w:p"))) {
    const numbered = numberingOf(paragraph);
    if (!numbered) {
      continue;
    }

    const levels = numbering.byNumId.get(numbered.numId);
    const level = levels?.get(numbered.ilvl);
    if (!levels || !level || UNMARKED_FORMATS.has(level.numFmt)) {
      continue;
    }

    let listCounters = counters.get(numbered.numId);
    if (!listCounters) {
      listCounters = new Map<number, number>();
      counters.set(numbered.numId, listCounters);
    }

    const current = listCounters.get(numbered.ilvl);
    listCounters.set(
      numbered.ilvl,
      current === undefined ? level.start : current + 1,
    );
    // Advancing a level restarts everything nested under it, as Word does.
    for (const ilvl of Array.from(listCounters.keys())) {
      if (ilvl > numbered.ilvl) {
        listCounters.delete(ilvl);
      }
    }

    prependLabelRun(
      doc,
      paragraph,
      renderLabel(level.lvlText, listCounters, levels),
    );

    // The numbering is deliberately left in place: mammoth still emits
    // <ol><li>, so the item keeps list spacing and indentation. Only the marker
    // is redundant now, and that is handled in CSS via markWordOrderedLists.
    changed = true;
  }

  return { xml: serializeXml(doc), changed };
}

function parseXml(xml: string): Document | null {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return doc.getElementsByTagName("parsererror").length > 0 ? null : doc;
}

function serializeXml(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

/**
 * Returns a .docx whose ordered list items carry their Word-rendered label as
 * literal text. Bulleted lists, and documents with no numbering, come back
 * untouched. Any failure returns the original buffer, so a document that cannot
 * be rewritten still imports — just with mammoth's default 1. 2. 3.
 */
export async function applyWordNumbering(
  docx: ArrayBuffer,
): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(docx);
    const documentEntry = zip.file(DOCUMENT_PATH);
    const numberingEntry = zip.file(NUMBERING_PATH);
    if (!documentEntry || !numberingEntry) {
      return docx;
    }

    const numberingDoc = parseXml(await numberingEntry.async("string"));
    if (!numberingDoc) {
      return docx;
    }

    const patched = rewriteDocument(
      await documentEntry.async("string"),
      parseNumbering(numberingDoc),
    );
    if (!patched.changed) {
      return docx;
    }

    zip.file(DOCUMENT_PATH, patched.xml);
    return await zip.generateAsync({ type: "arraybuffer" });
  } catch {
    return docx;
  }
}

/**
 * Tags every <ol> in freshly converted Word HTML, so the stylesheet can hide the
 * browser marker that would otherwise sit in front of the label the document
 * already supplies.
 *
 * Every ordered item in a Word import goes through applyWordNumbering above and
 * comes out carrying its label, so tagging all of them is exact — no guessing
 * from the text. Lists written in the editor never pass through here and keep
 * their normal numbering.
 */
export function markWordOrderedLists(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.body.querySelectorAll("ol").forEach((list) => {
    list.classList.add(WORD_NUMBERED_LIST_CLASS);
  });

  return doc.body.innerHTML;
}
