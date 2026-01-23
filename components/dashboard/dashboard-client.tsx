"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type ScatterPoint = {
  x: number; // composters
  y: number; // harvestKg
  waste: number;
  location: string;
  date: string;
};

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return (num / den) * 100;
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
  const [loading, setLoading] = React.useState(false);
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

  const locationTotals = React.useMemo(() => {
    const m = new Map<
      string,
      {
        location: string;
        records: number;
        wet: number;
        brown: number;
        leachate: number;
        harvest: number;
        compostersSum: number;
      }
    >();

    for (const r of filtered) {
      const key = r.location;
      const cur =
        m.get(key) ??
        ({
          location: key,
          records: 0,
          wet: 0,
          brown: 0,
          leachate: 0,
          harvest: 0,
          compostersSum: 0,
        } as const);

      m.set(key, {
        location: key,
        records: cur.records + 1,
        wet: cur.wet + (r.wetWasteKg ?? 0),
        brown: cur.brown + (r.brownWasteKg ?? 0),
        leachate: cur.leachate + (r.leachateL ?? 0),
        harvest: cur.harvest + (r.harvestKg ?? 0),
        compostersSum: cur.compostersSum + (r.composters ?? 0),
      });
    }

    return Array.from(m.values())
      .map((x) => {
        const waste = x.wet + x.brown;
        const compostersAvg = x.records ? x.compostersSum / x.records : 0;
        return {
          ...x,
          waste,
          compostersAvg,
          harvestPerWastePct: pct(x.harvest, waste),
          wastePerComposter: compostersAvg ? waste / compostersAvg : 0,
        };
      })
      .sort((a, b) => b.waste - a.waste);
  }, [filtered]);

  const topLocations = React.useMemo(() => locationTotals.slice(0, 12), [locationTotals]);

  const shareData = React.useMemo(
    () => [
      { name: "wet", label: "Wet Waste", value: totals.wetWasteKg },
      { name: "brown", label: "Brown Waste", value: totals.brownWasteKg },
      { name: "leachate", label: "Leachate", value: totals.leachateL },
      { name: "harvest", label: "Harvest", value: totals.harvestKg },
    ],
    [totals],
  );

  const efficiencyDaily = React.useMemo(() => {
    return daily.map((d) => {
      const waste = (d.wetWasteKg ?? 0) + (d.brownWasteKg ?? 0);
      return {
        date: d.date,
        waste,
        harvestKg: d.harvestKg ?? 0,
        leachateL: d.leachateL ?? 0,
        harvestPerWastePct: clamp(pct(d.harvestKg ?? 0, waste), 0, 500),
        leachatePerWastePct: clamp(pct(d.leachateL ?? 0, waste), 0, 500),
      };
    });
  }, [daily]);

  const scatter = React.useMemo<ScatterPoint[]>(() => {
    const points = filtered
      .filter((r) => Number.isFinite(r.composters) && Number.isFinite(r.harvestKg))
      .slice(-1500)
      .map((r) => ({
        x: r.composters,
        y: r.harvestKg,
        waste: (r.wetWasteKg ?? 0) + (r.brownWasteKg ?? 0),
        location: r.location,
        date: formatISODate(r.visitDate),
      }));
    return points;
  }, [filtered]);

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    setLoading(true);
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
    } finally {
      setLoading(false);
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
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wet Waste (Kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{totals.wetWasteKg.toLocaleString()}</CardContent>
        </Card>
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Brown Waste (Kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{totals.brownWasteKg.toLocaleString()}</CardContent>
        </Card>
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocation("all");
                setFrom("");
                setTo("");
              }}
            >
              Clear filters
            </Button>
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
            {loading ? (
              <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  wet: { label: "Wet Waste (Kg)", color: "var(--chart-1)" },
                  brown: { label: "Brown Waste (Kg)", color: "var(--chart-2)" },
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leachate & harvest (daily total)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  leachate: { label: "Leachate (L)", color: "var(--chart-4)" },
                  harvest: { label: "Harvest (Kg)", color: "var(--chart-5)" },
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
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily waste composition (stacked)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  wet: { label: "Wet Waste (Kg)", color: "var(--chart-1)" },
                  brown: { label: "Brown Waste (Kg)", color: "var(--chart-2)" },
                }}
              >
                <BarChart
                  data={daily.map((d) => ({ date: d.date, wet: d.wetWasteKg ?? 0, brown: d.brownWasteKg ?? 0 }))}
                  margin={{ left: 8, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickMargin={8} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis width={40} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="wet" name="wet" stackId="waste" fill="var(--color-wet)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="brown" name="brown" stackId="waste" fill="var(--color-brown)" radius={[4, 4, 0, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals share (filtered)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  wet: { label: "Wet Waste", color: "var(--chart-1)" },
                  brown: { label: "Brown Waste", color: "var(--chart-2)" },
                  leachate: { label: "Leachate", color: "var(--chart-4)" },
                  harvest: { label: "Harvest", color: "var(--chart-5)" },
                }}
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={shareData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={92} paddingAngle={2}>
                    {shareData.map((s) => (
                      <Cell key={s.name} fill={`var(--color-${s.name})`} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top locations by total waste</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[360px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[360px] w-full"
                config={{
                  wet: { label: "Wet Waste (Kg)", color: "var(--chart-1)" },
                  brown: { label: "Brown Waste (Kg)", color: "var(--chart-2)" },
                }}
              >
                <BarChart data={topLocations} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="location"
                    width={120}
                    tickFormatter={(v) => (String(v).length > 16 ? `${String(v).slice(0, 16)}…` : String(v))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(label) => <span className="font-medium">{String(label)}</span>}
                      />
                    }
                  />
                  <Bar dataKey="wet" name="wet" stackId="waste" fill="var(--color-wet)" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="brown" name="brown" stackId="waste" fill="var(--color-brown)" radius={[0, 4, 4, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Efficiency over time</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[360px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[360px] w-full"
                config={{
                  harvestPerWastePct: { label: "Harvest / Waste (%)", color: "var(--chart-5)" },
                  leachatePerWastePct: { label: "Leachate / Waste (%)", color: "var(--chart-4)" },
                }}
              >
                <ComposedChart data={efficiencyDaily} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickMargin={8} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis width={44} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Line
                    type="monotone"
                    dataKey="harvestPerWastePct"
                    name="harvestPerWastePct"
                    stroke="var(--color-harvestPerWastePct)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="leachatePerWastePct"
                    name="leachatePerWastePct"
                    stroke="var(--color-leachatePerWastePct)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </ComposedChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Composters vs Harvest (scatter)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[360px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <>
                <ChartContainer
                  className="h-[360px] w-full"
                  config={{
                    points: { label: "Records", color: "var(--chart-3)" },
                  }}
                >
                  <ScatterChart margin={{ left: 8, right: 16, top: 8 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="Composters" tickMargin={8} />
                    <YAxis type="number" dataKey="y" name="Harvest (Kg)" width={44} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideIndicator
                          formatter={(value, name, _item, _idx, payload) => {
                            const p = payload as unknown as ScatterPoint | undefined;
                            if (name === "x") {
                              return (
                                <div className="flex w-full justify-between gap-4">
                                  <span className="text-muted-foreground">Composters</span>
                                  <span className="font-mono font-medium tabular-nums">{Number(value).toLocaleString()}</span>
                                </div>
                              );
                            }
                            if (name === "y") {
                              return (
                                <div className="flex w-full justify-between gap-4">
                                  <span className="text-muted-foreground">Harvest (Kg)</span>
                                  <span className="font-mono font-medium tabular-nums">{Number(value).toLocaleString()}</span>
                                </div>
                              );
                            }
                            if (p?.location) {
                              return (
                                <div className="flex w-full justify-between gap-4">
                                  <span className="text-muted-foreground">Location</span>
                                  <span className="font-medium">{String(p.location)}</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      }
                    />
                    <Scatter data={scatter} fill="var(--color-points)" name="points" />
                  </ScatterChart>
                </ChartContainer>
                <div className="mt-2 text-xs text-muted-foreground">Showing up to {scatter.length} recent records.</div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Harvest vs Waste (daily)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[360px] w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <ChartContainer
                className="h-[360px] w-full"
                config={{
                  waste: { label: "Total Waste (Kg)", color: "var(--chart-2)" },
                  harvest: { label: "Harvest (Kg)", color: "var(--chart-5)" },
                }}
              >
                <ComposedChart data={efficiencyDaily} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickMargin={8} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis width={44} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="waste"
                    name="waste"
                    stroke="var(--color-waste)"
                    fill="var(--color-waste)"
                    fillOpacity={0.12}
                    strokeWidth={2}
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
                </ComposedChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

