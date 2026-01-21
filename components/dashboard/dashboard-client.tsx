"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatISODate } from "@/lib/format";

type ApiRow = {
  id: string;
  location: string;
  visitDate: string;
  composters: number;
  wetWasteKg: number;
  brownWasteKg: number;
  leachateL: number;
  harvestKg: number;
};

type Row = Omit<ApiRow, "visitDate"> & { visitDate: Date };

function sum(rows: Row[], key: keyof Pick<Row, "wetWasteKg" | "brownWasteKg" | "leachateL" | "harvestKg">) {
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0);
}

function groupByDate(rows: Row[]) {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = formatISODate(r.visitDate);
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rs]) => ({
      date,
      wetWasteKg: sum(rs, "wetWasteKg"),
      brownWasteKg: sum(rs, "brownWasteKg"),
      leachateL: sum(rs, "leachateL"),
      harvestKg: sum(rs, "harvestKg"),
    }));
}

export function DashboardClient({
  initialRows,
  refreshSignal,
}: {
  initialRows: ApiRow[];
  refreshSignal?: number;
}) {
  const [rows, setRows] = React.useState<Row[]>(
    initialRows.map((r) => ({ ...r, visitDate: new Date(r.visitDate) })),
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<string>("all");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  const locations = React.useMemo(() => {
    const s = new Set(rows.map((r) => r.location));
    return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (location !== "all" && r.location !== location) return false;
      if (from) {
        const d = new Date(from);
        if (r.visitDate < d) return false;
      }
      if (to) {
        const d = new Date(to);
        // include day
        d.setDate(d.getDate() + 1);
        if (r.visitDate >= d) return false;
      }
      return true;
    });
  }, [rows, location, from, to]);

  const daily = React.useMemo(() => groupByDate(filtered), [filtered]);

  const totals = React.useMemo(
    () => ({
      wetWasteKg: sum(filtered, "wetWasteKg"),
      brownWasteKg: sum(filtered, "brownWasteKg"),
      leachateL: sum(filtered, "leachateL"),
      harvestKg: sum(filtered, "harvestKg"),
      records: filtered.length,
    }),
    [filtered],
  );

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    try {
      const sp = new URLSearchParams();
      if (location !== "all") sp.set("location", location);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);

      const res = await fetch(`/api/ingestion?${sp.toString()}`);
      const json = (await res.json()) as
        | { ok: true; rows: ApiRow[] }
        | { ok: false; message: string };

      if (!res.ok || !json.ok) {
        setLoadError("message" in json ? json.message : "Failed to load data.");
        return;
      }

      setRows(json.rows.map((r) => ({ ...r, visitDate: new Date(r.visitDate) })));
    } catch {
      setLoadError("Failed to load data. Check your server logs / DATABASE_URL.");
    }
  }, [location, from, to]);

  React.useEffect(() => {
    void refresh();
  }, [refresh, refreshSignal]);

  return (
    <div className="grid gap-6">
      {loadError ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Couldn’t load dashboard data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wet Waste (Kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{totals.wetWasteKg.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Brown Waste (Kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{totals.brownWasteKg.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Harvest (Kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{totals.harvestKg.toLocaleString()}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>Filters</CardTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l === "all" ? "All locations" : l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{totals.records}</span> records
            {daily.length ? (
              <>
                {" "}
                from <span className="font-medium text-foreground">{daily[0].date}</span> to{" "}
                <span className="font-medium text-foreground">{daily[daily.length - 1].date}</span>
              </>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Waste trend (daily total)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[320px] w-full"
              config={{
                wet: { label: "Wet Waste (Kg)", color: "hsl(var(--chart-1))" },
                brown: { label: "Brown Waste (Kg)", color: "hsl(var(--chart-2))" },
              }}
            >
              <AreaChart data={daily} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickMargin={8} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis width={40} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area
                  type="monotone"
                  dataKey="wetWasteKg"
                  name="wet"
                  stroke="var(--color-wet)"
                  fill="var(--color-wet)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="brownWasteKg"
                  name="brown"
                  stroke="var(--color-brown)"
                  fill="var(--color-brown)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leachate & harvest (daily total)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[320px] w-full"
              config={{
                leachate: { label: "Leachate (L)", color: "hsl(var(--chart-4))" },
                harvest: { label: "Harvest (Kg)", color: "hsl(var(--chart-5))" },
              }}
            >
              <LineChart data={daily} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickMargin={8} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis width={40} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  type="monotone"
                  dataKey="leachateL"
                  name="leachate"
                  stroke="var(--color-leachate)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="harvestKg"
                  name="harvest"
                  stroke="var(--color-harvest)"
                  strokeWidth={2}
                  dot={false}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

