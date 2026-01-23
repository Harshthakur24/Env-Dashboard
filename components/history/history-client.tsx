"use client";

import * as React from "react";
import Link from "next/link";
import { UploadCard } from "@/components/upload/upload-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftIcon } from "lucide-react";

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

type IngestionRow = {
  id: string;
  location: string;
  visitDate: string;
  composters: number;
  wetWasteKg: number;
  brownWasteKg: number;
  leachateL: number;
  harvestKg: number;
};

type DraftRow = {
  location?: string;
  visitDate?: string;
  composters?: string | number;
  wetWasteKg?: string | number;
  brownWasteKg?: string | number;
  leachateL?: string | number;
  harvestKg?: string | number;
};

export function HistoryClient() {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = React.useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = React.useState<Record<string, boolean>>({});
  const [selectedHistoryId, setSelectedHistoryId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<IngestionRow[]>([]);
  const [rowsLoading, setRowsLoading] = React.useState(false);
  const [rowsError, setRowsError] = React.useState<string | null>(null);
  const [rowDrafts, setRowDrafts] = React.useState<Record<string, DraftRow>>({});
  const [rowSavingIds, setRowSavingIds] = React.useState<Record<string, boolean>>({});
  const [rowDeletingIds, setRowDeletingIds] = React.useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [pendingHistoryDeleteId, setPendingHistoryDeleteId] = React.useState<string | null>(null);

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
      setPendingHistoryDeleteId(null);
    }
  }, []);

  const loadRows = React.useCallback(async (historyId: string) => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const res = await fetch(`/api/history/${historyId}/rows`);
      const json = (await res.json()) as { ok: true; rows: IngestionRow[] } | { ok: false; message: string };
      if (!res.ok || !json.ok) {
        setRowsError("message" in json ? json.message : "Failed to load rows.");
        return;
      }
      setRows(json.rows);
      setRowDrafts((prev) => {
        const next = { ...prev };
        json.rows.forEach((row) => {
          next[row.id] = { ...row, visitDate: row.visitDate.slice(0, 10) };
        });
        return next;
      });
    } catch {
      setRowsError("Failed to load rows. Check your server logs.");
    } finally {
      setRowsLoading(false);
    }
  }, []);

  const updateRow = React.useCallback(
    async (row: IngestionRow) => {
      const draft = rowDrafts[row.id];
      if (!draft) return;
      setRowSavingIds((prev) => ({ ...prev, [row.id]: true }));
      try {
        const payload: Partial<IngestionRow> = {
          location: draft.location ?? row.location,
          visitDate: draft.visitDate ?? row.visitDate,
          composters: Number(draft.composters ?? row.composters),
          wetWasteKg: Number(draft.wetWasteKg ?? row.wetWasteKg),
          brownWasteKg: Number(draft.brownWasteKg ?? row.brownWasteKg),
          leachateL: Number(draft.leachateL ?? row.leachateL),
          harvestKg: Number(draft.harvestKg ?? row.harvestKg),
        };
        const res = await fetch(`/api/ingestion/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok: true; row: IngestionRow } | { ok: false; message: string };
        if (!res.ok || !json.ok) {
          setRowsError("message" in json ? json.message : "Failed to update row.");
          return;
        }
        setRows((prev) => prev.map((r) => (r.id === row.id ? json.row : r)));
        setRowDrafts((prev) => ({
          ...prev,
          [row.id]: { ...json.row, visitDate: json.row.visitDate.slice(0, 10) },
        }));
      } catch {
        setRowsError("Failed to update row. Please try again.");
      } finally {
        setRowSavingIds((prev) => ({ ...prev, [row.id]: false }));
      }
    },
    [rowDrafts],
  );

  const deleteRow = React.useCallback(async (id: string) => {
    setRowDeletingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/ingestion/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: true } | { ok: false; message: string };
      if (!res.ok || !json.ok) {
        setRowsError("message" in json ? json.message : "Failed to delete row.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setRowDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setRowsError("Failed to delete row. Please try again.");
    } finally {
      setRowDeletingIds((prev) => ({ ...prev, [id]: false }));
      setPendingDeleteId(null);
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
              <Link href="/"> <ArrowLeftIcon className="size-4" /> Back to dashboard</Link>
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
                      <TableRow
                        key={item.id}
                        className={`transition hover:bg-primary/5 ${selectedHistoryId === item.id ? "bg-primary/5" : ""}`}
                        onClick={() => {
                          setSelectedHistoryId(item.id);
                          void loadRows(item.id);
                        }}
                      >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleting}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingHistoryDeleteId(item.id);
                            }}
                          >
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

        {selectedHistoryId ? (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle>Uploaded data</CardTitle>
              <CardDescription>Table matches the Excel sheet layout. Click any cell to edit.</CardDescription>
            </CardHeader>
            <CardContent>
              {rowsError ? (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {rowsError}
                </div>
              ) : null}
              {rowsLoading ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">Loading rows…</div>
              ) : rows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name of the Project Location</TableHead>
                      <TableHead>Date of Visit</TableHead>
                      <TableHead>No. of composters</TableHead>
                      <TableHead>Sum of Wet Waste (Kg)</TableHead>
                      <TableHead>Sum of Brown Waste (Kg)</TableHead>
                      <TableHead>Sum of Leachate (Litre)</TableHead>
                      <TableHead>Sum of Harvest (Kg)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const draft = rowDrafts[row.id] ?? row;
                      const saving = rowSavingIds[row.id];
                      const deleting = rowDeletingIds[row.id];
                      return (
                        <TableRow key={row.id} className="transition hover:bg-primary/5">
                          <TableCell>
                            <Input
                              value={draft.location ?? row.location}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], location: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={(draft.visitDate ?? row.visitDate).slice(0, 10)}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], visitDate: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={draft.composters ?? row.composters}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], composters: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={draft.wetWasteKg ?? row.wetWasteKg}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], wetWasteKg: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={draft.brownWasteKg ?? row.brownWasteKg}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], brownWasteKg: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={draft.leachateL ?? row.leachateL}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], leachateL: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={draft.harvestKg ?? row.harvestKg}
                              onChange={(e) =>
                                setRowDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], harvestKg: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="secondary" disabled={saving} onClick={() => updateRow(row)}>
                                {saving ? "Saving…" : "Save"}
                              </Button>
                              <Button size="sm" variant="ghost" disabled={deleting} onClick={() => setPendingDeleteId(row.id)}>
                                {deleting ? "Deleting…" : "Delete"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No rows found for this upload.
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPendingDeleteId(null)} aria-hidden />
          <Card className="relative w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete row?</CardTitle>
              <CardDescription>This will permanently remove the selected row.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteRow(pendingDeleteId)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {pendingHistoryDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPendingHistoryDeleteId(null)} aria-hidden />
          <Card className="relative w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete upload history?</CardTitle>
              <CardDescription>This will remove the history entry. Uploaded rows stay in the database.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingHistoryDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteHistory(pendingHistoryDeleteId)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
