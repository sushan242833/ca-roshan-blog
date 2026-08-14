"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS, SITE_NAME } from "@/config/site.config";
import { MenuIcon, XIcon } from "@/components/icons";
import HeaderSearch from "@/components/layout/header-search";

const MOBILE_NAV_ID = "mobile-navigation";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMenuOpen(false);
  }

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:h-16">
        {/* Brand */}
        <Link href="/" className="font-serif text-xl font-bold text-brand-navy">
          {SITE_NAME}
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "text-[15px] transition-colors hover:text-brand-teal",
                  active
                    ? "text-brand-teal border-b-2 border-brand-teal pb-0.5"
                    : "text-brand-navy",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          <HeaderSearch />

          {/* Hamburger / Close — mobile only */}
          <button
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls={MOBILE_NAV_ID}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="md:hidden text-brand-navy"
          >
            {isMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMenuOpen && (
        <nav
          id={MOBILE_NAV_ID}
          aria-label="Mobile navigation"
          className="md:hidden w-full bg-white shadow-lg"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setIsMenuOpen(false)}
                className={[
                  "flex items-center h-12 px-6 border-b border-gray-200 text-[15px] transition-colors",
                  active ? "text-brand-teal font-bold" : "text-brand-navy",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
