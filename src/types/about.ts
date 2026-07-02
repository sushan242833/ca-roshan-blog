export interface ExpertiseItem {
  title: string;
  description: string;
}

export interface AboutPageResponse {
  name: string;
  title: string | null;
  avatarUrl: string | null;
  location: string | null;
  yearsOfExperience: string | null;
  qualification: string | null;
  bio: string | null;
  bioParagraph2: string | null;
  professionalQuote: string | null;
  expertise: ExpertiseItem[];
  closingMessage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}
