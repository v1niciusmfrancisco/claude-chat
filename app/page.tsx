import { redirect } from "next/navigation";
import { listSessions, getSession } from "@/lib/sessions";
import { Sidebar } from "@/components/sidebar";
import { ChatView } from "@/components/chat-view";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; q?: string; p?: string }>;
}) {
  const { s: selectedId, q, p: projectFilter } = await searchParams;
  const allSessions = listSessions();

  // Unique projects for the filter
  const projects = [...new Set(allSessions.map((s) => s.project))].sort();

  let filtered = allSessions;

  // Project filter
  if (projectFilter) {
    filtered = filtered.filter((s) => s.project === projectFilter);
  }

  // Text search
  if (q) {
    const term = q.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.summary.toLowerCase().includes(term) ||
        s.firstPrompt.toLowerCase().includes(term) ||
        s.project.toLowerCase().includes(term) ||
        s.gitBranch.toLowerCase().includes(term) ||
        s.sessionId.toLowerCase().includes(term)
    );
  }

  // Load selected session
  let session = null;
  if (selectedId) {
    const result = getSession(selectedId);
    if (result.redirectTo) {
      const params = new URLSearchParams();
      params.set("s", result.redirectTo);
      if (q) params.set("q", q);
      if (projectFilter) params.set("p", projectFilter);
      redirect(`/?${params.toString()}`);
    }
    if (result.meta && result.messages.length > 0) {
      session = result;
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        sessions={filtered}
        selectedId={selectedId || null}
        query={q || ""}
        projects={projects}
        activeProject={projectFilter || null}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {session ? (
          <ChatView
            messages={session.messages}
            meta={session.meta!}
            segments={session.segments}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-orange-600/60 text-sm">
                &gt; select a session
              </p>
              <p className="text-zinc-700 text-xs mt-1">
                {allSessions.length} sessions across{" "}
                {projects.length} projects
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
