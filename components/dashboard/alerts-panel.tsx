"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, generateAlerts } from "@/lib/alerts";
import { Row } from "@/components/dashboard/types";


interface AlertsPanelProps {
  rows: Row[];
}

export default function AlertsPanel({ rows }: AlertsPanelProps) {
  const alerts = React.useMemo(() => generateAlerts(rows), [rows]);

  if (!alerts.length) return null;

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {alerts.map(alert => (
        <Card
          key={alert.id}

          className={`animate-in fade-in slide-in-from-top-2 border ${
            alert.type === "warning" ? "border-amber-400 bg-amber-50" :
            alert.type === "info" ? "border-sky-400 bg-sky-50" :
            "border-green-400 bg-green-50"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {alert.type === "warning" ? "⚠️ Warning" : alert.type === "info" ? "ℹ️ Info" : "✅ Success"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {alert.message}
          </CardContent>
        </Card>

      ))}
    </div>
  );
}
