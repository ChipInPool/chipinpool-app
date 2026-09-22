import type { AnchorHTMLAttributes } from "react";
import { Link } from "wouter";

// Fragment links need native browser scrolling, not only a router URL update.
export function PublicNavigationLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return props.href?.includes("#") ? <a {...props} /> : <Link {...props} />;
}
