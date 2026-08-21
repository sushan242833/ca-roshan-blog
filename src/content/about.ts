export interface ExpertiseItem {
  title: string;
  description: string;
}

export interface AboutContent {
  name: string;
  title: string | null;
  avatarUrl: string | null;
  location: string | null;
  yearsOfExperience: string | null;
  qualification: string | null;
  bio: string | null;
  bioParagraph2: string | null;
  professionalQuote: string | null;
  /** Empty array hides the "Areas of Expertise" section entirely. */
  expertise: ExpertiseItem[];
  closingMessage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}

/** Local asset under public/ — no API or CDN request at render time. */
export const ABOUT_AVATAR_SRC = "/about/roshan-about.webp";

export const ABOUT_CONTENT: AboutContent = {
  name: "Roshan Poudel",
  title: "CA",
  avatarUrl: ABOUT_AVATAR_SRC,
  location: "Kathmandu, Nepal",
  yearsOfExperience: "5+ Years",
  qualification: "Chartered Accountant (CA)",
  bio: "I am a Chartered Accountant (CA) from the Institute of Chartered Accountants of Nepal (ICAN) with over five years of professional experience in taxation, auditing, financial reporting, regulatory compliance, and business advisory services. Throughout my career, I have advised domestic and multinational businesses across diverse industries, assisting them with complex tax matters, corporate structuring, regulatory compliance, financial due diligence, and strategic business decisions. My expertise spans direct and indirect taxation, transfer pricing, financial statement analysis, statutory and internal audits, and investment advisory.",
  bioParagraph2:
    "Beyond traditional professional practice, I have been actively involved in policy and regulatory initiatives. I have contributed to technical projects relating to Nepal's transfer pricing framework, including research and drafting recommendations on Advance Pricing Agreements (APA) and Safe Harbour Rules (SHR). My work combines international best practices with practical solutions tailored to Nepal's regulatory environment.",
  professionalQuote: "Knowledge opens doors. Expertise creates opportunities",
  expertise: [],
  // expertise: [
  //   {
  //     title: "Income Tax",
  //     description:
  //       "Strategic planning and comprehensive compliance for corporations and individuals.",
  //   },
  //   {
  //     title: "Corporate Tax",
  //     description:
  //       "Structuring, advisory, and optimization tailored to organizational goals.",
  //   },
  //   {
  //     title: "Audit & Assurance",
  //     description:
  //       "Rigorous statutory and internal audits ensuring absolute financial integrity.",
  //   },
  // ],
  closingMessage:
    "I am also passionate about knowledge sharing and professional education. Through articles, presentations, and educational content, I aim to simplify Nepal's tax and regulatory framework for businesses, professionals, and students.",
  seoTitle: "Roshan Poudel | CA - Chartered Accountant",
  seoDescription:
    "CA Roshan Poudel is a Chartered Accountant from Nepal specializing in taxation, audit, financial reporting, and compliance. He has professional experience in tax advisory, statutory audit, transfer pricing, and investment-related assignments, with a strong interest in corporate finance and investment banking.",
  ogImageUrl: null,
};
