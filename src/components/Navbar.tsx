"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { LoginModal } from "./LoginModal";

function isAdminOnlyPath(pathname: string): boolean {
  return (
    pathname === "/add" ||
    pathname.startsWith("/add/") ||
    /\/movies\/[^/]+\/edit\/?$/.test(pathname)
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  async function handleLogout() {
    await logout();
    if (isAdminOnlyPath(pathname)) {
      router.replace("/");
    }
    router.refresh();
  }

  const links = [
    { href: "/", label: "Browse" },
    { href: "/stats", label: "Stats" },
    ...(admin ? [{ href: "/add", label: "Add" }] : []),
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] text-accent transition hover:text-white"
          >
            SHELF
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold uppercase tracking-wider text-muted sm:gap-6">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active ? "text-white" : "transition hover:text-white"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
            {!loading &&
              (admin ? (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded border border-white/20 px-3 py-1.5 text-xs tracking-wider text-white transition hover:bg-white/10"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="rounded bg-accent px-3 py-1.5 text-xs tracking-wider text-white transition hover:bg-accent-soft"
                >
                  Login
                </button>
              ))}
          </nav>
        </div>
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
