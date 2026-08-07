import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  applyImportedAlignment,
  tagAlignedParagraphs,
  WORD_ALIGN_STYLE_MAP,
} from "@/lib/word-align-import";

const W_XMLNS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const para = (text: string, jc?: string) =>
  `<w:p><w:pPr>${jc ? `<w:jc w:val="${jc}"/>` : ""}</w:pPr>` +
  `<w:r><w:t>${text}</w:t></w:r></w:p>`;

async function docxWithBody(body: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("word/styles.xml", `<?xml version="1.0"?><w:styles ${W_XMLNS}></w:styles>`);
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document ${W_XMLNS}><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function documentXmlOf(docx: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/document.xml")!.async("string");
}

describe("tagAlignedParagraphs", () => {
  it("marks centred, right and justified paragraphs", async () => {
    const xml = await documentXmlOf(
      await tagAlignedParagraphs(
        await docxWithBody(
          para("c", "center") + para("r", "right") + para("j", "both"),
        ),
      ),
    );

    expect(xml).toContain("SiteAlignCenter");
    expect(xml).toContain("SiteAlignRight");
    expect(xml).toContain("SiteAlignJustify");
  });

  it("leaves left-aligned and unaligned paragraphs untouched", async () => {
    const source = await docxWithBody(para("plain") + para("l", "left"));

    // Nothing to change, so the original buffer comes straight back.
    expect(await tagAlignedParagraphs(source)).toBe(source);
  });

  it("declares the marker styles so mammoth recognises them", async () => {
    const zip = await JSZip.loadAsync(
      await tagAlignedParagraphs(await docxWithBody(para("c", "center"))),
    );
    const styles = await zip.file("word/styles.xml")!.async("string");

    // Named after the style id: that is the form mammoth's map matches.
    expect(styles).toContain('w:styleId="SiteAlignCenter"');
    expect(styles).toContain('w:val="SiteAlignCenter"');
  });

  it("returns the original buffer when there is no document.xml", async () => {
    const zip = new JSZip();
    zip.file("word/other.xml", "<x/>");
    const source = await zip.generateAsync({ type: "arraybuffer" });

    expect(await tagAlignedParagraphs(source)).toBe(source);
  });
});

describe("WORD_ALIGN_STYLE_MAP", () => {
  it("maps each marker style to its span", () => {
    expect(WORD_ALIGN_STYLE_MAP).toEqual([
      "r.SiteAlignCenter => span.word-align-center",
      "r.SiteAlignRight => span.word-align-right",
      "r.SiteAlignJustify => span.word-align-justify",
    ]);
  });
});

describe("applyImportedAlignment", () => {
  it("moves the alignment onto the paragraph and drops the marker", () => {
    const out = applyImportedAlignment(
      '<p><span class="word-align-center">​</span>Centred</p>',
    );

    expect(out).toBe('<p class="text-align-center">Centred</p>');
  });

  it("handles right and justify", () => {
    expect(
      applyImportedAlignment('<p><span class="word-align-right">x</span>R</p>'),
    ).toContain("text-align-right");
    expect(
      applyImportedAlignment('<p><span class="word-align-justify">x</span>J</p>'),
    ).toContain("text-align-justify");
  });

  it("wraps a list item's content in a paragraph, since the editor only aligns paragraphs", () => {
    const out = applyImportedAlignment(
      '<ol><li><span class="word-align-center">​</span>Item</li></ol>',
    );

    expect(out).toBe('<ol><li><p class="text-align-center">Item</p></li></ol>');
  });

  it("does not pull a nested list inside the wrapping paragraph", () => {
    const out = applyImportedAlignment(
      '<ul><li><span class="word-align-center">​</span>Outer<ul><li>Inner</li></ul></li></ul>',
    );

    expect(out).toContain('<p class="text-align-center">Outer</p>');
    expect(out).toContain("<ul><li>Inner</li></ul>");
  });

  it("aligns a heading in place", () => {
    const out = applyImportedAlignment(
      '<h2><span class="word-align-center">​</span>Title</h2>',
    );

    expect(out).toBe('<h2 class="text-align-center">Title</h2>');
  });

  it("leaves html with no markers unchanged", () => {
    const html = "<p>Nothing to do</p>";
    expect(applyImportedAlignment(html)).toBe(html);
  });
});
