"use client";

import SlugEntityManager from "@/components/admin/slug-entity-manager";
import { MAX_TAG_NAME_LENGTH } from "@/lib/constants";
import type { TagResponse } from "@/types/tag";

export default function AdminTagsPage() {
  return (
    <SlugEntityManager<TagResponse>
      entityLabel="Tag"
      entityLabelPlural="Tags"
      apiPath="/v1/tags"
      title="Tags"
      subtitle="Manage the tags used to group related content."
      nameMaxLength={MAX_TAG_NAME_LENGTH}
      revalidateScope="tags"
    />
  );
}
