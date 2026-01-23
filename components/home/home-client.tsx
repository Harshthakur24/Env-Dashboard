"use client";

import * as React from "react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";

export function HomeClient() {
  const refreshSignal = 0;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-neutral-100),transparent_55%),radial-gradient(ellipse_at_bottom,var(--color-neutral-200),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,var(--color-neutral-900),transparent_55%),radial-gradient(ellipse_at_bottom,var(--color-neutral-800),transparent_60%)]" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <div className="animate-in fade-in slide-in-from-top-2 flex items-start justify-between gap-4 duration-300">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground">Env Dashboard</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard overview</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track composting performance, waste flows, and daily efficiency. Uploads instantly refresh the charts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild className="shadow-lg">
              <Link href="/upload">Insert Excel sheet</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/history">View data history</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <DashboardClient initialRows={[]} refreshSignal={refreshSignal} />
      </main>
    </div>
  );
}

