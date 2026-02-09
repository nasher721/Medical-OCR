"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/lib/hooks/use-org";
import { TrainingService, TrainingMetrics } from "@/lib/services/training-service";
import { Model, TrainingExample } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { Loader2, BrainCircuit, RefreshCw, BarChart, History, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function ModelsPage() {
  const { currentOrg } = useOrgStore();
  const [models, setModels] = useState<Model[]>([]);
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  useEffect(() => {
    if (currentOrg) fetchModels();
  }, [currentOrg]);

  useEffect(() => {
    if (activeModel && currentOrg) {
      fetchModelData(activeModel.id);
    }
  }, [activeModel, currentOrg]);

  const fetchModels = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("models")
      .select("*")
      .eq("org_id", currentOrg!.id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setModels(data);
      setActiveModel(data[0]);
    }
    setLoading(false);
  };

  const fetchModelData = async (modelId: string) => {
    try {
      const [examplesData, metricsData] = await Promise.all([
        TrainingService.listExamples(currentOrg!.id, modelId),
        TrainingService.getMetrics(modelId),
      ]);
      setExamples(examplesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Failed to fetch model data", error);
    }
  };

  const handleRetrain = async () => {
    if (!activeModel) return;
    setRetraining(true);
    try {
      await TrainingService.retrain(activeModel.id);
      // Refresh metrics after a delay to simulate update
      setTimeout(() => {
        fetchModelData(activeModel.id);
        setRetraining(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <BrainCircuit className="mb-4 h-16 w-16 text-muted-foreground/20" />
        <h2 className="text-xl font-semibold">No Models Found</h2>
        <p className="text-muted-foreground">Create a model to start training.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Model Training</h1>
          <p className="text-sm text-muted-foreground">
            Monitor performance and retrain models with user feedback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={activeModel?.id || ""}
            onChange={(e) => {
              const model = models.find((m) => m.id === e.target.value);
              if (model) setActiveModel(model);
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (v{m.active_version})
              </option>
            ))}
          </select>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {retraining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {retraining ? "Training..." : "Retrain Now"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Metrics Cards */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Accuracy</h3>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {metrics ? Math.round(metrics.accuracy * 100) : "-"}%
            </span>
            <span className="mb-1 text-xs text-green-600 font-medium flex items-center">
              <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-green-600 mr-1"></span>
              +2.4%
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Based on last 50 validations</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Corrections</h3>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{metrics?.total_examples || "-"}</div>
          <p className="mt-2 text-xs text-muted-foreground">Training examples gathered</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Last Trained</h3>
            <History className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-xl font-medium truncate">
            {metrics?.last_trained
              ? formatDistanceToNow(new Date(metrics.last_trained), { addSuffix: true })
              : "Never"}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Current version: v{activeModel?.active_version}</p>
        </div>
      </div>

      {/* Examples List */}
      <div className="flex flex-1 flex-col rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Recent Corrections</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {examples.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
              <p>No corrections yet. Approve documents with edits to generate training data.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Field</th>
                  <th className="px-6 py-3 font-medium">Correct Value</th>
                  <th className="px-6 py-3 font-medium">Models</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {examples.map((ex) => (
                  <tr key={ex.id} className="group hover:bg-muted/50">
                    <td className="px-6 py-3 font-medium">{ex.field_key}</td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">{ex.correct_value}</td>
                    <td className="px-6 py-3 text-muted-foreground">v{activeModel?.active_version}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(ex.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
