"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { formatPostDate } from "@/lib/format";
import {
  revalidatePublicContent,
  type RevalidateScope,
} from "@/lib/revalidate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SlugEntityDialog, {
  type SlugEntityFormValues,
} from "@/components/admin/slug-entity-dialog";
import DeleteEntityDialog from "@/components/admin/delete-entity-dialog";
import FormMessage from "@/components/ui/form-message";

interface SlugEntityBase {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
}

export interface SlugEntityColumn<T> {
  header: string;
  cell: (item: T) => ReactNode;
}

interface SlugEntityManagerProps<T extends SlugEntityBase> {
  entityLabel: string;
  entityLabelPlural: string;
  /** Collection endpoint, e.g. "/v1/categories". */
  apiPath: string;
  title: string;
  subtitle: string;
  nameMaxLength: number;
  /** Public-page cache scope purged after each successful mutation. */
  revalidateScope: RevalidateScope;
  /** Extra columns rendered between Slug and Created. */
  extraColumns?: SlugEntityColumn<T>[];
  /** Caution line for the delete confirmation, e.g. attached post count. */
  getDeleteWarning?: (item: T) => string | null;
  /** When true, the create/edit dialog shows an optional description field. */
  showDescription?: boolean;
  descriptionMaxLength?: number;
}

type DialogState<T> = { mode: "create" } | { mode: "edit"; item: T } | null;

// Generic admin CRUD screen for slug-based entities (categories, tags) — the
// frontend counterpart of the backend's SlugEntityService. Pages compose this
// with their own columns and API paths.
export default function SlugEntityManager<T extends SlugEntityBase>({
  entityLabel,
  entityLabelPlural,
  apiPath,
  title,
  subtitle,
  nameMaxLength,
  revalidateScope,
  extraColumns = [],
  getDeleteWarning,
  showDescription = false,
  descriptionMaxLength,
}: SlugEntityManagerProps<T>) {
  const { authedFetch, getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [dialogState, setDialogState] = useState<DialogState<T>>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const lowerLabel = entityLabel.toLowerCase();
  const lowerPlural = entityLabelPlural.toLowerCase();

  // Shared cache key: categories/tags read from the SAME key here and in the
  // post editor (["categories"] / ["tags"] — see src/lib/query-keys.ts,
  // where queryKeys.categories/tags equal [revalidateScope]). A create/edit/
  // delete here therefore updates the editor's dropdowns without a reload,
  // and vice versa.
  const queryKey = [revalidateScope];

  const {
    data: items = [],
    isPending,
    isError,
    error: queryError,
    // The API already returns items sorted by name ascending — render as-is.
  } = useQuery({
    queryKey,
    queryFn: () => authedFetch<T[]>(apiPath),
  });

  const loadError = isError
    ? queryError instanceof ApiRequestError
      ? queryError.message
      : `Failed to load ${lowerPlural}.`
    : "";

  const saveMutation = useMutation({
    mutationFn: async (values: SlugEntityFormValues) => {
      if (dialogState?.mode === "edit") {
        await authedFetch<T>(`${apiPath}/${dialogState.item.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await authedFetch<T>(apiPath, {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      await revalidatePublicContent(revalidateScope, getAccessToken());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Throws on failure so the dialog can surface the message (e.g. the 409
  // "slug already exists" conflict) inline and stay open.
  async function handleSave(values: SlugEntityFormValues) {
    const isEdit = dialogState?.mode === "edit";
    await saveMutation.mutateAsync(values);
    toast.success(
      `${entityLabel} ${isEdit ? "updated" : "created"} successfully`,
    );
    setDialogState(null);
  }

  const deleteMutation = useMutation({
    mutationFn: async (item: T) => {
      await authedFetch<void>(`${apiPath}/${item.id}`, {
        method: "DELETE",
      });
      await revalidatePublicContent(revalidateScope, getAccessToken());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success(`${entityLabel} deleted successfully`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : `Failed to delete ${lowerLabel}.`,
      );
    }
  }

  const newButton = (
    <button
      type="button"
      onClick={() => setDialogState({ mode: "create" })}
      className="inline-flex items-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal"
    >
      <Plus size={16} />
      New {entityLabel}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        {newButton}
      </div>

      {loadError && (
        <FormMessage type="error" className="mt-6" message={loadError} />
      )}

      {isPending ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Spinner size={18} />
          Loading {lowerPlural}…
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12">
              <p className="text-sm text-gray-400">No {lowerPlural} yet.</p>
              {newButton}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Name
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Slug
                  </TableHead>
                  {extraColumns.map((column) => (
                    <TableHead
                      key={column.header}
                      className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {column.header}
                    </TableHead>
                  ))}
                  <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Created
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-6 py-4 text-sm font-medium text-brand-navy">
                      {item.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-mono text-xs text-gray-500">
                      {item.slug}
                    </TableCell>
                    {extraColumns.map((column) => (
                      <TableCell key={column.header} className="px-6 py-4">
                        {column.cell(item)}
                      </TableCell>
                    ))}
                    <TableCell className="px-6 py-4 text-sm text-gray-500">
                      {formatPostDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDialogState({ mode: "edit", item })}
                        aria-label={`Edit ${item.name}`}
                        className="p-1 text-gray-400 transition-colors hover:text-brand-teal"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        aria-label={`Delete ${item.name}`}
                        className="ml-2 p-1 text-gray-400 transition-colors hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {dialogState && (
        <SlugEntityDialog
          entityLabel={entityLabel}
          nameMaxLength={nameMaxLength}
          initialValues={
            dialogState.mode === "edit"
              ? {
                  name: dialogState.item.name,
                  slug: dialogState.item.slug,
                  description: dialogState.item.description ?? "",
                }
              : null
          }
          showDescription={showDescription}
          descriptionMaxLength={descriptionMaxLength}
          onOpenChange={(open) => {
            if (!open) setDialogState(null);
          }}
          onSubmit={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteEntityDialog
          entityLabel={entityLabel}
          entityName={deleteTarget.name}
          warning={getDeleteWarning?.(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
