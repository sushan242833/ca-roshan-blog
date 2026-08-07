import JSZip from "jszip";

// Carries Word's paragraph alignment through the import.
//
// Mammoth reads a paragraph's justification into its document model
// (`alignment`, from w:jc — see readParagraphProperties in
// mammoth/lib/docx/body-reader.js) but never emits it: every paragraph comes out
// as a plain <p>, so a centred line in Word arrives left-aligned.
//
// The fix mirrors the colour import next door. The .docx is rewritten before
// mammoth sees it: each aligned paragraph gets a marker run carrying a named
// CHARACTER style, a style map turns that into a span, and a post-conversion
// pass moves the alignment onto the block and drops the span.
//
// A character style is used rather than a paragraph style on purpose. A
// paragraph style would collide with the paragraph's real style — overwriting it
// would strip a heading of its heading-ness, since mammoth applies only one
// paragraph mapping per block. A character style is independent, so alignment
// survives on headings, list items and table cells alike.

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const DOCUMENT_PATH = "word/document.xml";
const STYLES_PATH = "word/styles.xml";

// A zero-width space: the marker run needs some text or mammoth emits no span
// for it at all. The span is removed again after conversion.
const MARKER_TEXT = "​";

export type ImportedAlignment = "center" | "right" | "justify";

// Word's w:jc values. "left"/"start" is the default and needs no marker;
// "both"/"distribute" are Word's justify.
const JC_TO_ALIGNMENT: Record<string, ImportedAlignment> = {
  center: "center",
  right: "right",
  end: "right",
  both: "justify",
  distribute: "justify",
};

const ALIGNMENT_ORDER: ImportedAlignment[] = ["center", "right", "justify"];

const ALIGNMENT_IMPORTS: Record<
  ImportedAlignment,
  { styleId: string; className: string; alignClass: string }
> = {
  center: {
    styleId: "SiteAlignCenter",
    className: "word-align-center",
    alignClass: "text-align-center",
  },
  right: {
    styleId: "SiteAlignRight",
    className: "word-align-right",
    alignClass: "text-align-right",
  },
  justify: {
    styleId: "SiteAlignJustify",
    className: "word-align-justify",
    alignClass: "text-align-justify",
  },
};

// Appended to mammoth's style map. The `r.<StyleId>` form is the one that
// actually matches (verified against mammoth's style reader: neither
// `r[style-id='…']` nor the declared style name does), which is also why
// declareAlignStyles below names each style after its own id.
export const WORD_ALIGN_STYLE_MAP = ALIGNMENT_ORDER.map((alignment) => {
  const { styleId, className } = ALIGNMENT_IMPORTS[alignment];
  return `r.${styleId} => span.${className}`;
});

function directChild(parent: Element, tag: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (child.tagName === tag) {
      return child;
    }
  }
  return null;
}

// Read from the paragraph's own w:pPr > w:jc, not any descendant, so a nested
// structure can never lend its justification to the paragraph around it.
function alignmentOfParagraph(paragraph: Element): ImportedAlignment | null {
  const props = directChild(paragraph, "w:pPr");
  const jc = props ? directChild(props, "w:jc") : null;
  const value = jc?.getAttribute("w:val");
  return value ? (JC_TO_ALIGNMENT[value] ?? null) : null;
}

function patchAlignedParagraphs(xml: string): {
  xml: string;
  changed: boolean;
} {
  const doc = parseXml(xml);
  if (!doc) {
    return { xml, changed: false };
  }

  let changed = false;
  for (const paragraph of Array.from(doc.getElementsByTagName("w:p"))) {
    const alignment = alignmentOfParagraph(paragraph);
    if (!alignment) {
      continue;
    }

    const run = doc.createElementNS(W_NS, "w:r");
    const runProps = doc.createElementNS(W_NS, "w:rPr");
    const runStyle = doc.createElementNS(W_NS, "w:rStyle");
    runStyle.setAttributeNS(
      W_NS,
      "w:val",
      ALIGNMENT_IMPORTS[alignment].styleId,
    );
    runProps.appendChild(runStyle);
    run.appendChild(runProps);

    const text = doc.createElementNS(W_NS, "w:t");
    text.setAttributeNS(XML_NS, "xml:space", "preserve");
    text.appendChild(doc.createTextNode(MARKER_TEXT));
    run.appendChild(text);

    // w:pPr must stay the first child of w:p, so the marker goes right after it.
    const props = directChild(paragraph, "w:pPr");
    if (props) {
      paragraph.insertBefore(run, props.nextSibling);
    } else {
      paragraph.insertBefore(run, paragraph.firstChild);
    }
    changed = true;
  }

  return { xml: serializeXml(doc), changed };
}

// Declaring the styles keeps mammoth from reporting them as unrecognised. The
// name is set to the style id so the map above matches whichever of the two
// mammoth resolves.
function declareAlignStyles(xml: string): string {
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

  for (const alignment of ALIGNMENT_ORDER) {
    const { styleId } = ALIGNMENT_IMPORTS[alignment];
    if (existing.has(styleId)) {
      continue;
    }
    const style = doc.createElementNS(W_NS, "w:style");
    style.setAttributeNS(W_NS, "w:type", "character");
    style.setAttributeNS(W_NS, "w:styleId", styleId);
    const name = doc.createElementNS(W_NS, "w:name");
    name.setAttributeNS(W_NS, "w:val", styleId);
    style.appendChild(name);
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

/**
 * Returns a .docx whose centred/right/justified paragraphs carry a marker run.
 * On any problem the original buffer comes back, so a document that cannot be
 * rewritten still imports — just left-aligned throughout.
 */
export async function tagAlignedParagraphs(
  docx: ArrayBuffer,
): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(docx);
    const documentEntry = zip.file(DOCUMENT_PATH);
    if (!documentEntry) {
      return docx;
    }

    const patched = patchAlignedParagraphs(await documentEntry.async("string"));
    if (!patched.changed) {
      return docx;
    }
    zip.file(DOCUMENT_PATH, patched.xml);

    const stylesEntry = zip.file(STYLES_PATH);
    if (stylesEntry) {
      zip.file(
        STYLES_PATH,
        declareAlignStyles(await stylesEntry.async("string")),
      );
    }

    return await zip.generateAsync({ type: "arraybuffer" });
  } catch {
    return docx;
  }
}

const MARKER_SELECTOR = ALIGNMENT_ORDER.map(
  (alignment) => `span.${ALIGNMENT_IMPORTS[alignment].className}`,
).join(", ");

// The editor's TextAlign extension carries alignment on paragraphs and headings
// only, so the class has to land on one of those to survive a round trip
// through the editor — not on the <li> or <td> around it.
const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6";
const CONTAINER_SELECTOR = "li, td, th, blockquote";

function alignmentOfMarker(marker: Element): ImportedAlignment | null {
  for (const alignment of ALIGNMENT_ORDER) {
    if (marker.classList.contains(ALIGNMENT_IMPORTS[alignment].className)) {
      return alignment;
    }
  }
  return null;
}

// Mammoth writes a single-paragraph list item as `<li>text</li>`, with no
// paragraph to hang the alignment on. Wrap the item's inline content in one,
// stopping at a nested list so a sub-list is never pulled inside a <p>.
function wrapInlineContent(doc: Document, container: Element): Element {
  const paragraph = doc.createElement("p");
  for (const node of Array.from(container.childNodes)) {
    if (
      node.nodeType === 1 &&
      ["UL", "OL"].includes((node as Element).tagName)
    ) {
      break;
    }
    paragraph.appendChild(node);
  }
  container.insertBefore(paragraph, container.firstChild);
  return paragraph;
}

/**
 * Moves the alignment recorded by the marker spans onto the block that holds
 * them, then removes the spans. Runs on mammoth's HTML output.
 */
export function applyImportedAlignment(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  for (const marker of Array.from(
    doc.body.querySelectorAll(MARKER_SELECTOR),
  )) {
    const alignment = alignmentOfMarker(marker);
    // Resolve the target before detaching the marker — afterwards it has no
    // ancestors to search.
    const block =
      marker.closest(BLOCK_SELECTOR) ?? marker.closest(CONTAINER_SELECTOR);
    marker.remove();

    if (!alignment || !block) {
      continue;
    }

    const target = block.matches(BLOCK_SELECTOR)
      ? block
      : wrapInlineContent(doc, block);
    target.classList.add(ALIGNMENT_IMPORTS[alignment].alignClass);
  }

  return doc.body.innerHTML;
}
