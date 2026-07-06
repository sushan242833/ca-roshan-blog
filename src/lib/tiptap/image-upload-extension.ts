import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { MediaResponse } from "@/types/media";

export interface ImageUploadOptions {
  /**
   * The shared upload primitive (useMediaUpload().uploadFile). Validates the
   * file and returns the stored media, or throws (MediaValidationError for a
   * rejected file, ApiRequestError for a server/network failure).
   */
  upload: (file: File) => Promise<MediaResponse>;
}

// Unique object identity per in-flight upload; used to locate the matching
// placeholder decoration after the async upload resolves.
type PlaceholderId = Record<string, never>;

interface PlaceholderMeta {
  add?: { id: PlaceholderId; pos: number; el: HTMLElement };
  remove?: { id: PlaceholderId };
}

const uploadKey = new PluginKey<DecorationSet>("imageUpload");

function createPlaceholderEl(): HTMLElement {
  const el = document.createElement("span");
  el.className = "image-upload-placeholder";
  el.setAttribute("contenteditable", "false");
  el.textContent = "Uploading image…";
  return el;
}

// Current document position of the placeholder with this id, or null if it
// has been removed (e.g. the surrounding content was deleted mid-upload).
function findPlaceholderPos(
  view: EditorView,
  id: PlaceholderId,
): number | null {
  const set = uploadKey.getState(view.state);
  if (!set) return null;
  const found = set.find(
    undefined,
    undefined,
    (spec) => (spec as { id?: PlaceholderId }).id === id,
  );
  return found.length ? found[0].from : null;
}

async function startUpload(
  view: EditorView,
  file: File,
  pos: number,
  upload: ImageUploadOptions["upload"],
): Promise<void> {
  const id: PlaceholderId = {};
  const el = createPlaceholderEl();

  // Show the placeholder immediately at the drop/caret position.
  view.dispatch(view.state.tr.setMeta(uploadKey, { add: { id, pos, el } }));

  try {
    const media = await upload(file);
    if (view.isDestroyed) return;

    const at = findPlaceholderPos(view, id);
    const tr = view.state.tr.setMeta(uploadKey, { remove: { id } });
    const imageType = view.state.schema.nodes.image;
    if (at != null && imageType) {
      tr.replaceWith(
        at,
        at,
        imageType.create({ src: media.url, alt: media.originalName }),
      );
    }
    view.dispatch(tr);
  } catch (err) {
    if (view.isDestroyed) return;
    // Flip the placeholder to an inline error in place — never written into
    // the document, so the rest of the draft is untouched — then clear it.
    el.classList.add("is-error");
    el.textContent =
      err instanceof Error ? err.message : "Image upload failed.";
    window.setTimeout(() => {
      if (!view.isDestroyed) {
        view.dispatch(view.state.tr.setMeta(uploadKey, { remove: { id } }));
      }
    }, 4000);
  }
}

function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter((file) =>
    file.type.startsWith("image/"),
  );
}

// Drag-drop and clipboard-paste image uploads, both routed through the same
// shared upload primitive as the media picker. A widget-decoration
// placeholder marks the insertion point while the upload is in flight.
export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: "imageUpload",

  addOptions() {
    return {
      upload: async () => {
        throw new Error("ImageUpload: no upload function configured.");
      },
    };
  },

  addProseMirrorPlugins() {
    const { upload } = this.options;

    return [
      new Plugin<DecorationSet>({
        key: uploadKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set) {
            let next = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(uploadKey) as PlaceholderMeta | undefined;
            if (meta?.add) {
              next = next.add(tr.doc, [
                Decoration.widget(meta.add.pos, meta.add.el, {
                  id: meta.add.id,
                }),
              ]);
            }
            if (meta?.remove) {
              const removeId = meta.remove.id;
              next = next.remove(
                next.find(
                  undefined,
                  undefined,
                  (spec) => (spec as { id?: PlaceholderId }).id === removeId,
                ),
              );
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            return uploadKey.getState(state);
          },
          handlePaste(view, event) {
            const images = imageFilesFrom(event.clipboardData);
            if (images.length === 0) return false;
            event.preventDefault();
            const pos = view.state.selection.from;
            images.forEach((file) => void startUpload(view, file, pos, upload));
            return true;
          },
          handleDrop(view, event) {
            const images = imageFilesFrom(event.dataTransfer);
            if (images.length === 0) return false;
            event.preventDefault();
            const coords = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const pos = coords ? coords.pos : view.state.selection.from;
            images.forEach((file) => void startUpload(view, file, pos, upload));
            return true;
          },
        },
      }),
    ];
  },
});

export default ImageUpload;
