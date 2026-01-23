"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type UploadResult =
  | {
    ok: true;
    created: number;
    updated: number;
    total: number;
    skipped?: number;
    errors?: Array<{ row: number; message: string }>;
    history?: { id: string; createdAt: string };
  }
  | { ok: false; message: string; errors?: Array<{ row: number; message: string }> };

type UploadEvent = {
  historyId?: string;
  createdAt?: string;
  fileName: string;
  created: number;
  updated: number;
  total: number;
  skipped?: number;
  errorCount?: number;
};

export function UploadCard({ onUploaded }: { onUploaded?: (event: UploadEvent) => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const fileSize = React.useMemo(() => {
    if (!file) return "";
    const kb = file.size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }, [file]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/ingestion", { method: "POST", body: fd });
      const json = (await res.json()) as UploadResult;
      setResult(json);
      if (json.ok) {
        onUploaded?.({
          historyId: json.history?.id,
          createdAt: json.history?.createdAt,
          fileName: file.name,
          created: json.created,
          updated: json.updated,
          total: json.total,
          skipped: json.skipped,
          errorCount: json.errors?.length ?? 0,
        });
      }
    } catch {
      setResult({ ok: false, message: "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.08),transparent_50%)]" />
      <CardHeader>
        <CardTitle>Upload Excel</CardTitle>
        <CardDescription>
          Upload a sheet with the agreed columns. We validate + clean before inserting into PostgreSQL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="file">Excel file</Label>
            <label
              htmlFor="file"
              className={`group relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-8 text-center transition ${dragActive
                ? "border-primary/80 bg-primary/10"
                : "border-border/70 bg-muted/30 hover:border-primary/60 hover:bg-muted/40"
                }`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) {
                  setFile(dropped);
                  if (inputRef.current) inputRef.current.files = e.dataTransfer.files;
                }
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V6" />
                  <path d="M8 10l4-4 4 4" />
                  <path d="M20 16.5a4.5 4.5 0 0 0-4.5-4.5H14" />
                  <path d="M4 16.5A4.5 4.5 0 0 1 8.5 12H10" />
                </svg>
              </div>
              <div className="text-base font-semibold text-foreground">
                Drop your file here, or{" "}
                <span className="text-primary underline-offset-4 group-hover:underline">browse</span>
              </div>
              <div className="text-sm text-muted-foreground">Supports: .xlsx, .xls</div>
              <Input
                ref={inputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                disabled={loading}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!file || loading} className="min-w-32 shadow-md shadow-primary/20">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/60 border-t-transparent" />
                  Uploading
                </span>
              ) : (
                "Upload"
              )}
            </Button>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Clear
              </Button>
            ) : null}
            {file ? (
              <Badge variant="secondary" className="max-w-full truncate">
                {file.name}
              </Badge>
            ) : null}
            {fileSize ? <Badge variant="outline">{fileSize}</Badge> : null}
          </div>

          {loading ? (
            <div className="grid gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Processing file… validating rows, cleaning values, and upserting to the database.</span>
                <span className="text-[10px] uppercase tracking-wide">Live</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary/60" />
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="animate-in fade-in zoom-in-95 rounded-lg border bg-card p-3 text-sm duration-200">
              {result.ok ? (
                <div className="flex flex-wrap gap-2">
                  <Badge>Inserted: {result.created}</Badge>
                  <Badge variant="secondary">Updated: {result.updated}</Badge>
                  <Badge variant="outline">Total processed: {result.total}</Badge>
                  {result.skipped ? <Badge variant="destructive">Skipped: {result.skipped}</Badge> : null}
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="font-medium text-destructive">{result.message}</div>
                  {result.errors?.length ? (
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {result.errors.slice(0, 8).map((e) => (
                        <li key={`${e.row}-${e.message}`}>
                          Row {e.row}: {e.message}
                        </li>
                      ))}
                      {result.errors.length > 8 ? <li>…and more</li> : null}
                    </ul>
                  ) : null}
                </div>
              )}
              {result.ok && result.errors?.length ? (
                <div className="mt-3 grid gap-2">
                  <div className="font-medium text-muted-foreground">Skipped rows</div>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {result.errors.slice(0, 8).map((e) => (
                      <li key={`${e.row}-${e.message}`}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                    {result.errors.length > 8 ? <li>…and more</li> : null}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

