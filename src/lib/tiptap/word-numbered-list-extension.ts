import { Extension } from "@tiptap/core";
import { WORD_NUMBERED_LIST_CLASS } from "@/lib/constants";

// Keeps the `word-numbered` class on ordered lists imported from Word.
//
// Those items already carry the label the source document renders — "(a)",
// "(iv)", "1)" — written in by lib/word-numbering-import.ts, so the stylesheet
// hides the browser marker that would otherwise duplicate it. Without this
// extension ProseMirror drops the unrecognised class the first time the
// imported HTML is loaded into the editor, and the marker reappears the moment
// the post is saved ("1. (a) …").
//
// Modelled on the TextAlign extension next to this file: a global attribute on
// an existing node type, expressed as a class so it survives sanitisation
// (see sanitize-html.ts, which allows `class` but almost no inline styles).
export const WordNumberedList = Extension.create({
  name: "wordNumberedList",

  addGlobalAttributes() {
    return [
      {
        types: ["orderedList"],
        attributes: {
          wordNumbered: {
            default: false,
            keepOnSplit: true,
            parseHTML: (element) =>
              element.classList.contains(WORD_NUMBERED_LIST_CLASS),
            renderHTML: (attributes) =>
              attributes.wordNumbered
                ? { class: WORD_NUMBERED_LIST_CLASS }
                : {},
          },
        },
      },
    ];
  },
});

export default WordNumberedList;
