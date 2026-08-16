import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFoundContent from "@/components/layout/not-found-content";
import PublicNotFound from "@/app/(public)/not-found";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("NotFoundContent", () => {
  it("renders no <main> of its own", () => {
    // (public)/layout.tsx already provides the page's single <main> landmark.
    // A <main> here would nest inside it and give the page two.
    const { container } = render(<NotFoundContent />);
    expect(container.querySelectorAll("main")).toHaveLength(0);
  });

  it("carries no background colour", () => {
    // A content-sized bg-gray-50 box inside the layout's full-height <main>
    // produced a grey band that stopped partway down the page.
    const { container } = render(<NotFoundContent />);
    expect(container.innerHTML).not.toContain("bg-gray-50");
    expect(container.innerHTML).not.toContain("bg-gray-100");
  });

  it("centres itself vertically in a viewport-proportional band", () => {
    const { container } = render(<NotFoundContent />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toContain("min-h-[70vh]");
    expect(wrapper.className).toContain("items-center");
    expect(wrapper.className).toContain("justify-center");
  });

  it("states the 404 and offers a way onward", () => {
    const { container, getByRole } = render(<NotFoundContent />);

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(getByRole("heading", { level: 1 }).textContent).toMatch(
      /could not be found/i,
    );
    expect(getByRole("link", { name: /browse all articles/i })).toHaveAttribute(
      "href",
      "/blogs",
    );
    expect(getByRole("link", { name: /return home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("(public)/not-found", () => {
  it("renders the bare block, inheriting chrome from the public layout", () => {
    const { container } = render(<PublicNotFound />);

    expect(container.querySelectorAll("main")).toHaveLength(0);
    expect(container.querySelectorAll("header")).toHaveLength(0);
    expect(container.querySelectorAll("footer")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });
});
