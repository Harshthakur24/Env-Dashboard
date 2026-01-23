"use client";

import * as React from "react";
import Link from "next/link";
import { UploadCard } from "@/components/upload/upload-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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

export function UploadPageClient() {
  const [refreshSignal, setRefreshSignal] = React.useState(0);
  const [rows, setRows] = React.useState<IngestionRow[]>([]);
  const [rowsLoading, setRowsLoading] = React.useState(false);
  const [rowsError, setRowsError] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, DraftRow>>({});
  const [savingIds, setSavingIds] = React.useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = React.useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const loadRows = React.useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const res = await fetch("/api/ingestion");
      const json = (await res.json()) as { ok: true; rows: IngestionRow[] } | { ok: false; message: string };
      if (!res.ok || !json.ok) {
        setRowsError("message" in json ? json.message : "Failed to load rows.");
        return;
      }
      setRows(json.rows);
      setDrafts((prev) => {
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

  React.useEffect(() => {
    void loadRows();
  }, [loadRows, refreshSignal]);

  const updateRow = React.useCallback(
    async (row: IngestionRow) => {
      const draft = drafts[row.id];
      if (!draft) return;
      setSavingIds((prev) => ({ ...prev, [row.id]: true }));
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
        setDrafts((prev) => ({
          ...prev,
          [row.id]: { ...json.row, visitDate: json.row.visitDate.slice(0, 10) },
        }));
      } catch {
        setRowsError("Failed to update row. Please try again.");
      } finally {
        setSavingIds((prev) => ({ ...prev, [row.id]: false }));
      }
    },
    [drafts],
  );

  const deleteRow = React.useCallback(async (id: string) => {
    setDeletingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/ingestion/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: true } | { ok: false; message: string };
      if (!res.ok || !json.ok) {
        setRowsError("message" in json ? json.message : "Failed to delete row.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setRowsError("Failed to delete row. Please try again.");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [id]: false }));
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
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Insert Excel sheet</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Upload, validate, and merge data by Location + Visit Date. All uploads are tracked in history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Back to dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/history">View data history</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <Card className="relative w-full overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_45%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.1),transparent_55%)]" />
          <CardHeader>
            <CardTitle>Upload Excel</CardTitle>
            <CardDescription>We validate + clean before inserting into PostgreSQL.</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadCard onUploaded={() => setRefreshSignal((n) => n + 1)} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_45%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.1),transparent_55%)]" />
            <CardHeader>
              <CardTitle>What happens after upload</CardTitle>
              <CardDescription>Smart validation keeps your dataset clean.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Validate required columns + data types.</li>
                <li>Normalize dates and numeric fields.</li>
                <li>Upsert by Location + Visit Date.</li>
                <li>Track insert/update counts in history.</li>
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Required columns</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Name of the Project Location</li>
                  <li>Date of Visit</li>
                  <li>No. of composters</li>
                  <li>Sum of Wet Waste (Kg)</li>
                  <li>Sum of Brown Waste (Kg)</li>
                  <li>Sum of Leachate (Litre)</li>
                  <li>Sum of Harvest (Kg)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle>All data</CardTitle>
              <CardDescription>Edit any cell and save, or delete rows instantly.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadRows} disabled={rowsLoading}>
              Refresh data
            </Button>
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
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Composters</TableHead>
                    <TableHead>Wet (Kg)</TableHead>
                    <TableHead>Brown (Kg)</TableHead>
                    <TableHead>Leachate (L)</TableHead>
                    <TableHead>Harvest (Kg)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const draft = drafts[row.id] ?? row;
                    const saving = savingIds[row.id];
                    const deleting = deletingIds[row.id];
                    return (
                      <TableRow key={row.id} className="transition hover:bg-primary/5">
                        <TableCell>
                          <Input
                            value={draft.location ?? row.location}
                            onChange={(e) =>
                              setDrafts((prev) => ({
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
                              setDrafts((prev) => ({
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
                              setDrafts((prev) => ({
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
                              setDrafts((prev) => ({
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
                              setDrafts((prev) => ({
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
                              setDrafts((prev) => ({
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
                              setDrafts((prev) => ({
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
                No data yet. Upload an Excel file to populate the table.
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
}
