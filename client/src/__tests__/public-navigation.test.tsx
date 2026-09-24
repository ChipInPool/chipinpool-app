import { describe, expect, it } from "vitest";
import { Link } from "wouter";
import { PublicNavigationLink } from "@/components/public-navigation-link";

describe("Public navigation links", () => {
  it("uses native navigation for section links", () => {
    const link = PublicNavigationLink({ href: "/welcome#features", children: "Features" });
    expect(link.type).toBe("a");
    expect(link.props.href).toBe("/welcome#features");
  });

  it("preserves client-side navigation for ordinary pages", () => {
    expect(PublicNavigationLink({ href: "/pricing", children: "Fees" }).type).toBe(Link);
  });

  it("preserves the mobile menu close handler", () => {
    const onClick = () => undefined;
    expect(PublicNavigationLink({ href: "/welcome#features", onClick }).props.onClick).toBe(onClick);
  });
});
