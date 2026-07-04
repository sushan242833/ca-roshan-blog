import PostEditor from "@/components/admin/post-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  return <PostEditor postId={id} />;
}
