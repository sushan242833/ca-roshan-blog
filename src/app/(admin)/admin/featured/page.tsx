"use client";

import FeaturedSlotsManager from "@/components/admin/featured-slots-manager";

// Protected like every other admin page: proxy.ts gates /admin/* on the
// session cookie, and the (admin) layout wraps it in AdminGuard.
export default function AdminFeaturedPage() {
  return <FeaturedSlotsManager />;
}
