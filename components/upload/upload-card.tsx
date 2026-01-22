"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type UploadResult =
  | { ok: true; created: number; updated: number; total: number; skipped?: number; errors?: Array<{ row: number; message: string }> }
  | { ok: false; message: string; errors?: Array<{ row: number; message: string }> };

export function UploadCard({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<UploadResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

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
      if (json.ok) onUploaded?.();
    } catch {
      setResult({ ok: false, message: "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
            <div className="group relative">
              <Input
                ref={inputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls"
                className="cursor-pointer file:cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-transparent transition group-hover:ring-border/60" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!file || loading} className="min-w-28">
              {loading ? "Uploading…" : "Upload"}
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
          </div>

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

