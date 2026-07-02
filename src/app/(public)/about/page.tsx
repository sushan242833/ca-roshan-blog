import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Briefcase, BadgeCheck } from "lucide-react";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import { apiRequest } from "@/lib/api";
import { SITE_NAME } from "@/config/site.config";
import type { AboutPageResponse } from "@/types/about";

const DEFAULT_BIO =
  "CA Roshan brings over a decade of experience in tax " +
  "advisory and financial consulting across Nepal.";

async function getAboutPage(): Promise<AboutPageResponse | null> {
  try {
    return await apiRequest<AboutPageResponse>("/v1/auth/about", {
      next: { revalidate: 300 },
    });
  } catch (err) {
    console.error("Failed to fetch about page data:", err);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutPage();
  const description =
    about?.seoDescription ??
    about?.bio?.split(/(?<=[.!?])\s/)[0] ??
    DEFAULT_BIO;

  return {
    title: about?.seoTitle ?? `About | ${SITE_NAME}`,
    description,
    openGraph: about?.ogImageUrl
      ? { images: [{ url: about.ogImageUrl }] }
      : undefined,
  };
}

export default async function AboutPage() {
  const about = await getAboutPage();
  const name = about?.name ?? SITE_NAME;
  const bio = about?.bio ?? DEFAULT_BIO;

  return (
    <div className="bg-white">
      <section className="py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 md:grid-cols-[300px_1fr]">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg">
              {about?.avatarUrl ? (
                <Image
                  src={about.avatarUrl}
                  alt={name}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                />
              ) : (
                <PostImagePlaceholder className="absolute inset-0" />
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-6">
              <h1 className="font-serif text-2xl font-bold text-brand-navy">
                {name}
              </h1>
              <p className="mt-1 text-xs font-semibold tracking-widest text-brand-teal uppercase">
                {about?.title ?? "Chartered Accountant"}
              </p>

              {(about?.location || about?.yearsOfExperience || about?.qualification) && (
                <div className="mt-5 space-y-3 text-sm text-gray-600">
                  {about?.location && (
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="shrink-0 text-brand-teal" />
                      <span>{about.location}</span>
                    </div>
                  )}
                  {about?.yearsOfExperience && (
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} className="shrink-0 text-brand-teal" />
                      <span>{about.yearsOfExperience}</span>
                    </div>
                  )}
                  {about?.qualification && (
                    <div className="flex items-center gap-3">
                      <BadgeCheck size={16} className="shrink-0 text-brand-teal" />
                      <span>{about.qualification}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="rounded-lg border border-gray-200 p-8">
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              Professional Background
            </h2>
            <p className="mt-4 leading-relaxed text-gray-600">{bio}</p>
            {about?.bioParagraph2 && (
              <p className="mt-4 leading-relaxed text-gray-600">
                {about.bioParagraph2}
              </p>
            )}

            {about?.professionalQuote && (
              <blockquote className="my-8 border-l-4 border-brand-teal bg-gray-50 py-4 pr-4 pl-6 font-serif text-lg italic text-brand-navy">
                &ldquo;{about.professionalQuote}&rdquo;
              </blockquote>
            )}

            {about && about.expertise.length > 0 && (
              <>
                <h2 className="font-serif text-2xl font-bold text-brand-navy">
                  Areas of Expertise
                </h2>
                <ul className="mt-4 space-y-3">
                  {about.expertise.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 bg-brand-teal"
                      />
                      <p className="text-gray-600">
                        <strong className="font-semibold text-brand-navy">
                          {item.title}:
                        </strong>{" "}
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {about?.closingMessage && (
              <p className="mt-8 leading-relaxed text-gray-600">
                {about.closingMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
