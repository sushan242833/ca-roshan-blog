This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Feature flags

Flags follow the `FEATURE_FLAG_*` convention: the string `"1"` turns a feature **on**; `"0"` or an unset variable turns it **off** (the default). Flags are read only through `src/config/features.ts` — never `process.env` directly in components.

| Flag | Default | Values | Effect |
| --- | --- | --- | --- |
| `FEATURE_FLAG_CONTACT_PAGE` | `0` (off) | `1` = on, `0`/unset = off | Shows the Contact nav link, renders `/contact` (otherwise 404), and lists `/contact` in the sitemap. |

**Build-time (frontend).** The value is inlined at build via the `env` mapping in `next.config.ts`, so flipping the frontend half requires a **rebuild** (`npm run build`), not just a restart. The matching **backend** flag (`FEATURE_FLAG_CONTACT_PAGE`, which gates `POST /api/v1/contact`) is read at **runtime** and only needs a restart. Set both `.env` files to the same value.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
