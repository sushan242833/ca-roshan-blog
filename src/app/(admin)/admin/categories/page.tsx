"use client";

import SlugEntityManager, {
  type SlugEntityColumn,
} from "@/components/admin/slug-entity-manager";
import { MAX_CATEGORY_NAME_LENGTH } from "@/lib/constants";
import type { CategoryResponse } from "@/types/category";

const CATEGORY_COLUMNS: SlugEntityColumn<CategoryResponse>[] = [
  {
    header: "Post Count",
    cell: (category) => (
      <span className="inline-flex min-w-8 justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-navy">
        {category.postCount}
      </span>
    ),
  },
];

export default function AdminCategoriesPage() {
  return (
    <SlugEntityManager<CategoryResponse>
      entityLabel="Category"
      entityLabelPlural="Categories"
      apiPath="/v1/categories"
      title="Categories"
      subtitle="Manage the categories used to organize your posts."
      nameMaxLength={MAX_CATEGORY_NAME_LENGTH}
      extraColumns={CATEGORY_COLUMNS}
      getDeleteWarning={(category) =>
        category.postCount > 0
          ? `This category is attached to ${category.postCount} published post(s).`
          : null
      }
    />
  );
}
