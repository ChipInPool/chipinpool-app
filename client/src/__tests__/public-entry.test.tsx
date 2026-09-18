import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  location: "/register",
  search: "",
  authenticated: false,
  loading: false,
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    isAuthenticated: state.authenticated,
    isLoading: state.loading,
    login: vi.fn(),
    register: vi.fn(),
  }),
}));
vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  useLocation: () => [state.location, vi.fn()],
  useSearch: () => state.search,
  Redirect: ({ to }: { to: string }) => <a href={to}>Sign in required</a>,
}));
import { RequireAuth } from "@/components/require-auth";
import Login from "@/pages/login";

describe("Account entry", () => {
  beforeEach(() =>
    Object.assign(state, {
      location: "/register",
      search: "",
      authenticated: false,
      loading: false,
    }),
  );

  it("opens registration directly from the public Get Started destination", () => {
    const html = renderToStaticMarkup(<Login />);
    expect(html).toContain('id="register-firstName"');
    expect(html).toContain('id="register-password"');
    expect(html).not.toContain('id="login-password"');
  });

  it("keeps the ordinary login destination on sign in", () => {
    state.location = "/login";
    const html = renderToStaticMarkup(<Login />);
    expect(html).not.toContain('id="register-firstName"');
    expect(html).toContain('data-testid="tab-login"');
  });

  it("does not render or mount account settings while signed out", () => {
    const privatePage = vi.fn(() => <p>Private settings</p>);
    const PrivatePage = privatePage;
    const html = renderToStaticMarkup(
      <RequireAuth>
        <PrivatePage />
      </RequireAuth>,
    );
    expect(privatePage).not.toHaveBeenCalled();
    expect(html).toContain("/login?redirect=security");
    expect(html).not.toContain("Private settings");
  });

  it("waits for authentication without mounting settings", () => {
    state.loading = true;
    const html = renderToStaticMarkup(
      <RequireAuth>
        <p>Private settings</p>
      </RequireAuth>,
    );
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Private settings");
    expect(html).not.toContain("Sign in required");
  });

  it("renders settings for an authenticated user", () => {
    state.authenticated = true;
    expect(
      renderToStaticMarkup(
        <RequireAuth>
          <p>Private settings</p>
        </RequireAuth>,
      ),
    ).toContain("Private settings");
  });
});
