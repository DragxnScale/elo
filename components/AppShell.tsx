"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyLeaderboards, getSessionProfile } from "@/app/actions";
import { ViewLeaderboards } from "@/components/ViewLeaderboards";
import { CreateLeaderboard } from "@/components/CreateLeaderboard";
import { EditLeaderboards } from "@/components/EditLeaderboards";
import { ConfigBanner } from "@/components/ConfigBanner";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { TabPanel, Tabs } from "@/components/ui/tabs";

type Tab = "view" | "create" | "edit";

type AuthState = {
  /** False until the first session check has finished (successfully or not). */
  ready: boolean;
  isAuthenticated: boolean;
  username: string | null;
  hasBoards: boolean;
};

const INITIAL_AUTH: AuthState = {
  ready: false,
  isAuthenticated: false,
  username: null,
  hasBoards: false,
};

type LoadedAuth = Omit<AuthState, "hasBoards"> & {
  /** null when the boards lookup failed: keep whatever was known before. */
  hasBoards: boolean | null;
};

/**
 * One round trip (plus the boards lookup when signed in). Never throws.
 * Returns null when the session check itself failed, so the caller can decide
 * what "unknown" means (see resolveAuth).
 */
async function loadAuthState(): Promise<LoadedAuth | null> {
  let session: Awaited<ReturnType<typeof getSessionProfile>>;
  try {
    session = await getSessionProfile();
  } catch {
    return null;
  }
  if (!session.user) {
    return { ...INITIAL_AUTH, ready: true };
  }
  let hasBoards: boolean | null = null;
  try {
    const result = await getMyLeaderboards();
    if (!("error" in result)) hasBoards = result.leaderboards.length > 0;
  } catch {
    // Leave hasBoards unknown; the signed-in state is still right.
  }
  return {
    ready: true,
    isAuthenticated: true,
    username: session.profile?.username ?? null,
    hasBoards,
  };
}

/**
 * Folds a load result into the current state. A failed first check counts as
 * signed out so the shell is never stuck on skeletons; a failed refresh keeps
 * what the person already saw rather than flipping them to signed out.
 */
function resolveAuth(prev: AuthState, next: LoadedAuth | null): AuthState {
  if (!next) return prev.ready ? prev : { ...INITIAL_AUTH, ready: true };
  return { ...next, hasBoards: next.hasBoards ?? prev.hasBoards };
}

function PanelSkeleton() {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
      <Skeleton className="h-11" />
    </div>
  );
}

const panelClass = "pt-8 sm:pt-10";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("view");
  const [auth, setAuth] = useState<AuthState>(INITIAL_AUTH);
  const { ready: authReady, isAuthenticated, username, hasBoards } = auth;

  const refreshAuth = useCallback(async () => {
    const next = await loadAuthState();
    setAuth((prev) => resolveAuth(prev, next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAuthState().then((next) => {
      if (!cancelled) setAuth((prev) => resolveAuth(prev, next));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived, not stored: losing the last board while on Edit falls back to View.
  const activeTab: Tab = tab === "edit" && !hasBoards ? "view" : tab;

  const items: { value: Tab; label: string }[] = [
    { value: "view", label: "View" },
    { value: "create", label: "Create" },
  ];
  if (hasBoards) items.push({ value: "edit", label: "Edit" });

  return (
    <>
      <ConfigBanner />
      <SiteHeader
        username={username}
        authReady={authReady}
        onAuthChange={refreshAuth}
      />

      <Container as="main" className="pb-16">
        <Tabs
          variant="underline"
          idPrefix="shell"
          aria-label="Leaderboards"
          items={items}
          value={activeTab}
          onValueChange={setTab}
        />

        <TabPanel
          idPrefix="shell"
          value="view"
          active={activeTab === "view"}
          className={panelClass}
        >
          {authReady ? (
            <ViewLeaderboards
              isAuthenticated={isAuthenticated}
              onCreateBoard={() => setTab("create")}
            />
          ) : (
            <PanelSkeleton />
          )}
        </TabPanel>
        <TabPanel
          idPrefix="shell"
          value="create"
          active={activeTab === "create"}
          className={panelClass}
        >
          {authReady ? (
            <CreateLeaderboard
              isAuthenticated={isAuthenticated}
              onCreated={refreshAuth}
            />
          ) : (
            <PanelSkeleton />
          )}
        </TabPanel>
        {hasBoards && (
          <TabPanel
            idPrefix="shell"
            value="edit"
            active={activeTab === "edit"}
            className={panelClass}
          >
            <EditLeaderboards
              isAuthenticated={isAuthenticated}
              onCreateBoard={() => setTab("create")}
              onBoardsChanged={refreshAuth}
            />
          </TabPanel>
        )}
      </Container>
    </>
  );
}
