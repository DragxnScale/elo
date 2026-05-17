"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionProfile } from "@/app/actions";
import { AuthPanel } from "@/components/AuthPanel";
import { ViewLeaderboards } from "@/components/ViewLeaderboards";
import { CreateLeaderboard } from "@/components/CreateLeaderboard";
import { EditLeaderboards } from "@/components/EditLeaderboards";
import { ConfigBanner } from "@/components/ConfigBanner";
import { getMyLeaderboards } from "@/app/actions";

type Tab = "view" | "create" | "edit";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("view");
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasBoards, setHasBoards] = useState(false);

  const refreshAuth = useCallback(async () => {
    const { user, profile } = await getSessionProfile();
    setIsAuthenticated(!!user);
    setUsername(profile?.username ?? null);

    if (user) {
      const { leaderboards } = await getMyLeaderboards();
      setHasBoards((leaderboards?.length ?? 0) > 0);
    } else {
      setHasBoards(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "view", label: "View Leaderboards" },
    { id: "create", label: "Create Leaderboards" },
  ];
  if (hasBoards) {
    tabs.push({ id: "edit", label: "Edit Leaderboards" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />

      <ConfigBanner />
      <header className="relative border-b border-cyan-500/10 bg-[#050810]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-cyan-500/70">
              Nexus Rank
            </p>
            <h1 className="bg-gradient-to-r from-cyan-200 via-white to-violet-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              ELO Leaderboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Live ratings. Upsets rewarded. Fair losses cushioned.
            </p>
          </div>
          <AuthPanel
            username={username}
            onAuthChange={refreshAuth}
            canCreateMatch={hasBoards}
            onCreateMatch={() => setTab("edit")}
          />
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-8">
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-200 ring-1 ring-cyan-500/40"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "view" && (
          <ViewLeaderboards isAuthenticated={isAuthenticated} />
        )}
        {tab === "create" && (
          <CreateLeaderboard
            isAuthenticated={isAuthenticated}
            onCreated={refreshAuth}
          />
        )}
        {tab === "edit" && hasBoards && (
          <EditLeaderboards isAuthenticated={isAuthenticated} />
        )}
      </main>
    </div>
  );
}
