import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  applyWordNumbering,
  markWordOrderedLists,
} from "@/lib/word-numbering-import";
import { WORD_NUMBERED_LIST_CLASS } from "@/lib/constants";

const W_XMLNS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

interface LevelSpec {
  ilvl?: number;
  numFmt: string;
  lvlText: string;
  start?: number;
}

function levelXml({ ilvl = 0, numFmt, lvlText, start = 1 }: LevelSpec): string {
  return (
    `<w:lvl w:ilvl="${ilvl}">` +
    `<w:start w:val="${start}"/>` +
    `<w:numFmt w:val="${numFmt}"/>` +
    `<w:lvlText w:val="${lvlText}"/>` +
    `</w:lvl>`
  );
}

/** A docx with one abstract numbering definition, exposed as numId 1. */
async function docx(levels: LevelSpec[], body: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/numbering.xml",
    `<?xml version="1.0" encoding="UTF-8"?>` +
      `<w:numbering ${W_XMLNS}>` +
      `<w:abstractNum w:abstractNumId="7">${levels.map(levelXml).join("")}</w:abstractNum>` +
      `<w:num w:numId="1"><w:abstractNumId w:val="7"/></w:num>` +
      `</w:numbering>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>` +
      `<w:document ${W_XMLNS}><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

/** A numbered paragraph at the given level. */
const item = (text: string, ilvl = 0) =>
  `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="1"/></w:numPr></w:pPr>` +
  `<w:r><w:t>${text}</w:t></w:r></w:p>`;

/** An ordinary paragraph, which interrupts a list without ending it. */
const prose = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

async function documentXmlOf(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml")!.async("string");
}

/** The visible text of each paragraph, in order. */
async function paragraphs(buffer: ArrayBuffer): Promise<string[]> {
  const xml = await documentXmlOf(buffer);
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map((p) =>
    [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1])
      .join("")
      .trim(),
  );
}

const LOWER_LETTER: LevelSpec = { numFmt: "lowerLetter", lvlText: "(%1)" };

describe("applyWordNumbering", () => {
  it("writes Word's lettered label into the paragraph text", async () => {
    const out = await applyWordNumbering(
      await docx([LOWER_LETTER], item("First") + item("Second")),
    );

    expect(await paragraphs(out)).toEqual(["(a) First", "(b) Second"]);
  });

  it("keeps counting when other paragraphs interrupt the list", async () => {
    // This is the case that rendered as "1." … "1." before: each run of list
    // items became its own <ol> and restarted.
    const out = await applyWordNumbering(
      await docx(
        [LOWER_LETTER],
        item("First") + prose("Commentary") + item("Second"),
      ),
    );

    expect(await paragraphs(out)).toEqual([
      "(a) First",
      "Commentary",
      "(b) Second",
    ]);
  });

  it("keeps the numbering so mammoth still emits <ol><li>", async () => {
    // The list structure is what gives the item list spacing rather than
    // paragraph margins; only the marker is redundant, and CSS handles that.
    const out = await applyWordNumbering(
      await docx([LOWER_LETTER], item("First")),
    );

    expect(await documentXmlOf(out)).toContain("w:numPr");
  });

  it("honours the level's own start value", async () => {
    const out = await applyWordNumbering(
      await docx(
        [{ ...LOWER_LETTER, start: 3 }],
        item("Third letter") + item("Fourth letter"),
      ),
    );

    expect(await paragraphs(out)).toEqual([
      "(c) Third letter",
      "(d) Fourth letter",
    ]);
  });

  it("supports the other Word number formats", async () => {
    const roman = await applyWordNumbering(
      await docx(
        [{ numFmt: "upperRoman", lvlText: "%1." }],
        item("One") + item("Two") + item("Three") + item("Four"),
      ),
    );
    expect(await paragraphs(roman)).toEqual([
      "I. One",
      "II. Two",
      "III. Three",
      "IV. Four",
    ]);

    const decimal = await applyWordNumbering(
      await docx([{ numFmt: "decimal", lvlText: "%1)" }], item("One")),
    );
    expect(await paragraphs(decimal)).toEqual(["1) One"]);
  });

  it("letters past z continue aa, ab", async () => {
    const body = Array.from({ length: 28 }, (_, i) => item(`n${i}`)).join("");
    const labels = await paragraphs(
      await applyWordNumbering(await docx([LOWER_LETTER], body)),
    );

    expect(labels[25]).toBe("(z) n25");
    expect(labels[26]).toBe("(aa) n26");
    expect(labels[27]).toBe("(ab) n27");
  });

  it("nests levels and restarts the inner one under each outer item", async () => {
    const out = await applyWordNumbering(
      await docx(
        [
          { ilvl: 0, numFmt: "decimal", lvlText: "%1." },
          { ilvl: 1, numFmt: "lowerLetter", lvlText: "%1.%2" },
        ],
        item("One") +
          item("One-a", 1) +
          item("One-b", 1) +
          item("Two") +
          item("Two-a", 1),
      ),
    );

    expect(await paragraphs(out)).toEqual([
      "1. One",
      "1.a One-a",
      "1.b One-b",
      "2. Two",
      "2.a Two-a",
    ]);
  });

  it("leaves bulleted lists alone for mammoth to render as <ul>", async () => {
    const source = await docx(
      [{ numFmt: "bullet", lvlText: "" }],
      item("Bullet one") + item("Bullet two"),
    );
    const out = await applyWordNumbering(source);

    // Untouched, so the original buffer comes straight back.
    expect(out).toBe(source);
    expect(await documentXmlOf(out)).toContain("w:numPr");
  });

  it("returns the original buffer when the docx has no numbering", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document ${W_XMLNS}><w:body>${prose("Hi")}</w:body></w:document>`,
    );
    const source = await zip.generateAsync({ type: "arraybuffer" });

    expect(await applyWordNumbering(source)).toBe(source);
  });
});

describe("markWordOrderedLists", () => {
  it("tags ordered lists so the duplicate marker can be hidden", () => {
    const out = markWordOrderedLists("<ol><li>(a) First</li></ol>");

    expect(out).toContain(`class="${WORD_NUMBERED_LIST_CLASS}"`);
  });

  it("leaves bulleted lists untagged", () => {
    const out = markWordOrderedLists("<ul><li>Bullet</li></ul>");

    expect(out).not.toContain(WORD_NUMBERED_LIST_CLASS);
    expect(out).toBe("<ul><li>Bullet</li></ul>");
  });

  it("tags every list, including nested ones", () => {
    const out = markWordOrderedLists(
      "<ol><li>(a) One<ol><li>(i) Inner</li></ol></li></ol>",
    );

    expect((out.match(new RegExp(WORD_NUMBERED_LIST_CLASS, "g")) ?? []).length)
      .toBe(2);
  });

  it("keeps any classes already on the list", () => {
    const out = markWordOrderedLists('<ol class="keep"><li>(a) x</li></ol>');

    expect(out).toContain("keep");
    expect(out).toContain(WORD_NUMBERED_LIST_CLASS);
  });
});
