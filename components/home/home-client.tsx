"use client";

import * as React from "react";
import { UploadCard } from "@/components/upload/upload-card";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function HomeClient() {
  const [refreshSignal, setRefreshSignal] = React.useState(0);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.neutral.100),transparent_55%),radial-gradient(ellipse_at_bottom,theme(colors.neutral.200),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,theme(colors.neutral.900),transparent_55%),radial-gradient(ellipse_at_bottom,theme(colors.neutral.800),transparent_60%)]" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <div className="animate-in fade-in slide-in-from-top-2 flex items-start justify-between gap-4 duration-300">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground">Env Dashboard</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Excel ingestion + analytics</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload teacher-submitted Excel files, validate + clean data on the server, store in PostgreSQL, and
            visualize trends with shadcn charts.
          </p>
          </div>
          <ThemeToggle />
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
              <UploadCard onUploaded={() => setRefreshSignal((n) => n + 1)} />
              <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Required columns</div>
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    <li>Name of the Project Location</li>
                    <li>Date of Visit</li>
                    <li>No. of composters</li>
                    <li>Sum of Wet Waste (Kg)</li>
                    <li>Sum of Brown Waste (Kg)</li>
                    <li>Sum of Leachate (Litre)</li>
                    <li>Sum of Harvest (Kg)</li>
                  </ul>
                  <div className="mt-4">
                    Data is upserted by <span className="font-medium text-foreground">Location + Visit Date</span>.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardClient initialRows={[]} refreshSignal={refreshSignal} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

