"use client";

import * as React from "react";
import Link from "next/link";
import { UploadCard } from "@/components/upload/upload-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type HistoryItem = {
  id: string;
  fileName: string;
  created: number;
  updated: number;
  total: number;
  skipped?: number | null;
  errorCount?: number | null;
  createdAt: string;
  note?: string | null;
};

export function HistoryClient() {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = React.useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = React.useState<Record<string, boolean>>({});

  const formatTime = React.useCallback((iso: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  }, []);

  const historyTotals = React.useMemo(() => {
    return history.reduce(
      (acc, item) => {
        acc.uploads += 1;
        acc.rows += item.total;
        acc.inserted += item.created;
        acc.updated += item.updated;
        return acc;
      },
      { uploads: 0, rows: 0, inserted: 0, updated: 0 },
    );
  }, [history]);

  const lastUpload = history[0]?.createdAt ? formatTime(history[0].createdAt) : "—";

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/history");
      const json = (await res.json()) as { ok: true; items: HistoryItem[] } | { ok: false; message: string };
      if (!res.ok || !json.ok) {
        setHistoryError("message" in json ? json.message : "Failed to load history.");
        return;
      }
      setHistory(json.items);
      setNoteDrafts((prev) => {
        const next = { ...prev };
        json.items.forEach((item) => {
          next[item.id] = item.note ?? "";
        });
        return next;
      });
    } catch {
      setHistoryError("Failed to load history. Check your server logs.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const updateNote = React.useCallback(
    async (item: HistoryItem) => {
      const nextNote = noteDrafts[item.id] ?? "";
      if (nextNote === (item.note ?? "")) return;
      setSavingIds((prev) => ({ ...prev, [item.id]: true }));
      try {
        const res = await fetch(`/api/history/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: nextNote.length ? nextNote : null }),
        });
        const json = (await res.json()) as { ok: true; item: HistoryItem } | { ok: false; message: string };
        if (!res.ok || !json.ok) {
          setHistoryError("message" in json ? json.message : "Failed to update note.");
          return;
        }
        setHistory((prev) => prev.map((h) => (h.id === item.id ? json.item : h)));
      } catch {
        setHistoryError("Failed to update note. Please try again.");
      } finally {
        setSavingIds((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [noteDrafts],
  );

  const deleteHistory = React.useCallback(async (id: string) => {
    setDeletingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: true } | { ok: false; message: string };
      if (!res.ok || !json.ok) {
        setHistoryError("message" in json ? json.message : "Failed to delete history.");
        return;
      }
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      setHistoryError("Failed to delete history. Please try again.");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-neutral-100),transparent_55%),radial-gradient(ellipse_at_bottom,var(--color-neutral-200),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,var(--color-neutral-900),transparent_55%),radial-gradient(ellipse_at_bottom,var(--color-neutral-800),transparent_60%)]" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <div className="animate-in fade-in slide-in-from-top-2 flex items-start justify-between gap-4 duration-300">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground">Env Dashboard</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Upload history</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track every Excel ingestion with counts, errors, and notes. Updates are stored in PostgreSQL.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_45%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.1),transparent_55%)]" />
              <CardHeader>
                <CardTitle>Insert Excel sheet</CardTitle>
                <CardDescription>We validate and merge by Location + Visit Date.</CardDescription>
              </CardHeader>
              <CardContent>
                <UploadCard
                  onUploaded={(event) => {
                    const historyId = event.historyId;
                    const createdAt = event.createdAt;
                    if (historyId && createdAt) {
                      setHistory((prev) => [
                        {
                          id: historyId,
                          createdAt,
                          fileName: event.fileName,
                          created: event.created,
                          updated: event.updated,
                          total: event.total,
                          skipped: event.skipped ?? 0,
                          errorCount: event.errorCount ?? 0,
                          note: null,
                        },
                        ...prev,
                      ]);
                      setNoteDrafts((prev) => ({ ...prev, [historyId]: "" }));
                    } else {
                      void loadHistory();
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_55%)]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total uploads</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{historyTotals.uploads}</CardContent>
            </Card>
            <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Rows processed</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{historyTotals.rows.toLocaleString()}</CardContent>
            </Card>
            <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Last upload</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">{lastUpload}</CardContent>
              <div className="px-6 pb-6 text-xs text-muted-foreground">
                Inserted {historyTotals.inserted.toLocaleString()} • Updated {historyTotals.updated.toLocaleString()}
              </div>
            </Card>
          </div>
        </div>

        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle>Upload history</CardTitle>
              <CardDescription>Excel insertions stored in PostgreSQL with editable notes.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadHistory} disabled={historyLoading}>
                Refresh
              </Button>
              <Badge variant="secondary">{history.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {historyError ? (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {historyError}
              </div>
            ) : null}
            {historyLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Inserted</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Skipped</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={`skeleton-${idx}`} className="animate-pulse">
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                      <TableCell className="h-10 rounded-md bg-muted/40" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : history.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Inserted</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Skipped</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const saving = savingIds[item.id];
                    const deleting = deletingIds[item.id];
                    return (
                      <TableRow key={item.id} className="transition hover:bg-primary/5">
                        <TableCell className="font-medium">{item.fileName}</TableCell>
                        <TableCell>{item.created}</TableCell>
                        <TableCell>{item.updated}</TableCell>
                        <TableCell>{item.total}</TableCell>
                        <TableCell>{item.skipped ?? 0}</TableCell>
                        <TableCell>{item.errorCount ?? 0}</TableCell>
                        <TableCell className="min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <Input
                              value={noteDrafts[item.id] ?? ""}
                              placeholder="Add note"
                              onChange={(e) =>
                                setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                            />
                            <Button size="sm" variant="secondary" disabled={saving} onClick={() => updateNote(item)}>
                              {saving ? "Saving…" : "Save"}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatTime(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" disabled={deleting} onClick={() => deleteHistory(item.id)}>
                            {deleting ? "Deleting…" : "Delete"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                No uploads yet. Insert an Excel file to create the first history row.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
