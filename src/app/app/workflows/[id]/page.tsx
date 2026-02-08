'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { createClient } from '@/lib/supabase/client';
import type { Workflow, WorkflowRun, WorkflowLog } from '@/lib/supabase/types';
import { ArrowLeft, Save, Play, ChevronDown, ChevronRight, Zap, GitBranch, Eye, Webhook, FileDown, Mail, Upload } from 'lucide-react';

const NODE_TYPES_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  upload: { label: 'Upload', color: '#22c55e', icon: '📤', bg: 'bg-green-50 border-green-300' },
  extract: { label: 'Extract Fields', color: '#3b82f6', icon: '🔍', bg: 'bg-blue-50 border-blue-300' },
  rule: { label: 'Confidence Rule', color: '#f97316', icon: '⚖️', bg: 'bg-orange-50 border-orange-300' },
  review: { label: 'Human Review', color: '#eab308', icon: '👁️', bg: 'bg-yellow-50 border-yellow-300' },
  webhook_export: { label: 'Webhook Export', color: '#a855f7', icon: '🔗', bg: 'bg-purple-50 border-purple-300' },
  csv_export: { label: 'CSV Export', color: '#6366f1', icon: '📄', bg: 'bg-indigo-50 border-indigo-300' },
  notify: { label: 'Email Notify', color: '#6b7280', icon: '📧', bg: 'bg-gray-50 border-gray-300' },
};

function CustomNode({ data }: { data: { label: string; type: string; config: Record<string, unknown> } }) {
  const cfg = NODE_TYPES_CONFIG[data.type] || NODE_TYPES_CONFIG.upload;
  return (
    <div className={`rounded-lg border-2 px-4 py-3 shadow-sm ${cfg.bg}`} style={{ minWidth: 160 }}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex items-center gap-2">
        <span className="text-lg">{cfg.icon}</span>
        <div>
          <div className="text-sm font-semibold">{cfg.label}</div>
          {data.type === 'rule' && data.config.threshold ? (
            <div className="text-xs text-muted-foreground">Threshold: {String(data.config.threshold)}</div>
          ) : null}
          {data.type === 'webhook_export' && data.config.url ? (
            <div className="max-w-[120px] truncate text-xs text-muted-foreground">{String(data.config.url)}</div>
          ) : null}
          {data.type === 'notify' && data.config.notify_event ? (
            <div className="text-xs text-muted-foreground">Event: {String(data.config.notify_event)}</div>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

export default function WorkflowBuilderPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const supabase = createClient();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<Record<string, WorkflowLog[]>>({});
  const [testDocId, setTestDocId] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [running, setRunning] = useState(false);
  const [showRuns, setShowRuns] = useState(false);

  // Config form state
  const [configThreshold, setConfigThreshold] = useState(0.90);
  const [configActionPass, setConfigActionPass] = useState('approve');
  const [configActionFail, setConfigActionFail] = useState('needs_review');
  const [configUrl, setConfigUrl] = useState('');
  const [configEmail, setConfigEmail] = useState('');
  const [configNotifyEvent, setConfigNotifyEvent] = useState('document_approved');

  const fetchWorkflow = async () => {
    const { data: wf } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
    setWorkflow(wf);

    const { data: dbNodes } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', workflowId);
    const { data: dbEdges } = await supabase.from('workflow_edges').select('*').eq('workflow_id', workflowId);

    const flowNodes: Node[] = (dbNodes || []).map(n => ({
      id: n.node_id,
      type: 'custom',
      position: n.position as { x: number; y: number },
      data: { label: NODE_TYPES_CONFIG[n.type]?.label || n.type, type: n.type, config: n.config },
    }));

    const flowEdges: Edge[] = (dbEdges || []).map(e => ({
      id: e.edge_id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#94a3b8' },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);

    // Fetch runs
    const { data: r } = await supabase.from('workflow_runs').select('*').eq('workflow_id', workflowId).order('started_at', { ascending: false }).limit(10);
    setRuns(r || []);
  };

  useEffect(() => { fetchWorkflow(); }, [workflowId]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, animated: true, style: { stroke: '#94a3b8' } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    const config = node.data.config || {};
    setConfigThreshold((config.threshold as number) || 0.90);
    setConfigActionPass((config.action_pass as string) || 'approve');
    setConfigActionFail((config.action_fail as string) || 'needs_review');
    setConfigUrl((config.url as string) || '');
    setConfigEmail((config.email_to as string) || '');
    setConfigNotifyEvent((config.notify_event as string) || 'document_approved');
  }, []);

  const addNode = (type: string) => {
    const id = `${type}_${Date.now()}`;
    const cfg = NODE_TYPES_CONFIG[type];
    const newNode: Node = {
      id,
      type: 'custom',
      position: { x: 250 + Math.random() * 100, y: 100 + nodes.length * 100 },
      data: { label: cfg?.label || type, type, config: {} },
    };
    setNodes(nds => [...nds, newNode]);
  };

  const updateNodeConfig = () => {
    if (!selectedNode) return;
    const config: Record<string, unknown> = {};
    const type = selectedNode.data.type;
    if (type === 'rule') { config.threshold = configThreshold; config.action_pass = configActionPass; config.action_fail = configActionFail; }
    if (type === 'webhook_export') { config.url = configUrl; config.method = 'POST'; }
    if (type === 'notify') { config.email_to = configEmail; config.notify_event = configNotifyEvent; }

    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, config } } : n));
    setSelectedNode(null);
  };

  const handleSave = async () => {
    setSaving(true);
    // Delete existing and re-insert
    await supabase.from('workflow_nodes').delete().eq('workflow_id', workflowId);
    await supabase.from('workflow_edges').delete().eq('workflow_id', workflowId);

    if (nodes.length > 0) {
      const nodeInserts = nodes.map(n => ({
        workflow_id: workflowId,
        node_id: n.id,
        type: n.data.type,
        position: n.position,
        config: n.data.config || {},
      }));
      await supabase.from('workflow_nodes').insert(nodeInserts);
    }

    if (edges.length > 0) {
      const edgeInserts = edges.map(e => ({
        workflow_id: workflowId,
        edge_id: e.id,
        source: e.source,
        target: e.target,
      }));
      await supabase.from('workflow_edges').insert(edgeInserts);
    }
    setSaving(false);
  };

  const handleTestRun = async () => {
    if (!testDocId.trim()) return;
    setRunning(true);
    // Save first
    await handleSave();
    const resp = await fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: testDocId }),
    });
    if (resp.ok) {
      const data = await resp.json();
      setShowTestDialog(false);
      setTestDocId('');
      fetchWorkflow(); // Refresh runs
    }
    setRunning(false);
  };

  const fetchRunLogs = async (runId: string) => {
    if (runLogs[runId]) return;
    const { data } = await supabase.from('workflow_logs').select('*').eq('workflow_run_id', runId).order('step_order', { ascending: true });
    setRunLogs(prev => ({ ...prev, [runId]: data || [] }));
  };

  const toggleRun = (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null);
    } else {
      setExpandedRun(runId);
      fetchRunLogs(runId);
    }
  };

  if (!workflow) {
    return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/app/workflows" className="rounded-md p-1.5 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-lg font-semibold">{workflow.name}</h1>
            <p className="text-xs text-muted-foreground">{workflow.doc_type} workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTestDialog(true)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
            <Play className="h-3.5 w-3.5" /> Test Run
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-50"
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-left">
              <div className="flex flex-wrap gap-1.5 rounded-lg bg-white p-2 shadow-md">
                {Object.entries(NODE_TYPES_CONFIG).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <span>{cfg.icon}</span> {cfg.label}
                  </button>
                ))}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config drawer */}
        {selectedNode && (
          <div className="w-80 overflow-auto border-l bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Node Config</h3>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="mb-3 rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{NODE_TYPES_CONFIG[selectedNode.data.type]?.label}</p>
              <p className="text-xs text-muted-foreground">ID: {selectedNode.id}</p>
            </div>

            {selectedNode.data.type === 'rule' && (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-medium">Confidence Threshold</label><input type="number" value={configThreshold} onChange={e => setConfigThreshold(parseFloat(e.target.value))} step={0.01} min={0} max={1} className="w-full rounded border px-2 py-1.5 text-sm" /></div>
                <div><label className="mb-1 block text-xs font-medium">If Pass</label><select value={configActionPass} onChange={e => setConfigActionPass(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm"><option value="approve">Auto-Approve</option><option value="continue">Continue</option></select></div>
                <div><label className="mb-1 block text-xs font-medium">If Fail</label><select value={configActionFail} onChange={e => setConfigActionFail(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm"><option value="needs_review">Needs Review</option><option value="reject">Reject</option><option value="continue">Continue</option></select></div>
              </div>
            )}

            {selectedNode.data.type === 'webhook_export' && (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-medium">Webhook URL</label><input type="url" value={configUrl} onChange={e => setConfigUrl(e.target.value)} placeholder="https://..." className="w-full rounded border px-2 py-1.5 text-sm" /></div>
              </div>
            )}

            {selectedNode.data.type === 'notify' && (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-medium">Email To</label><input type="email" value={configEmail} onChange={e => setConfigEmail(e.target.value)} placeholder="user@example.com" className="w-full rounded border px-2 py-1.5 text-sm" /></div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Event Type</label>
                  <select value={configNotifyEvent} onChange={e => setConfigNotifyEvent(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm">
                    <option value="document_approved">Document Approved</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="workflow_error">Workflow Error</option>
                  </select>
                </div>
              </div>
            )}

            <button onClick={updateNodeConfig} className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Apply Config
            </button>

            <button
              onClick={() => { setNodes(nds => nds.filter(n => n.id !== selectedNode.id)); setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id)); setSelectedNode(null); }}
              className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete Node
            </button>
          </div>
        )}
      </div>

      {/* Run History */}
      <div className="border-t">
        <button onClick={() => setShowRuns(!showRuns)} className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/50">
          <span>Run History ({runs.length})</span>
          {showRuns ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {showRuns && (
          <div className="max-h-48 overflow-auto border-t">
            {runs.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No runs yet</p>
            ) : runs.map(run => (
              <div key={run.id} className="border-b">
                <button onClick={() => toggleRun(run.id)} className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-muted/30">
                  <span className={`h-2 w-2 rounded-full ${run.status === 'completed' ? 'bg-green-500' : run.status === 'failed' ? 'bg-red-500' : run.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <span className="font-medium capitalize">{run.status}</span>
                  <span className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleString()}</span>
                </button>
                {expandedRun === run.id && runLogs[run.id] && (
                  <div className="bg-muted/20 px-6 py-2">
                    {runLogs[run.id].map(log => (
                      <div key={log.id} className="flex items-center gap-2 py-1 text-xs">
                        <span className={`h-1.5 w-1.5 rounded-full ${log.status === 'success' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className="font-mono">{log.node_id}</span>
                        <span className="text-muted-foreground">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Run Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Test Run Workflow</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Document ID</label>
              <input type="text" value={testDocId} onChange={e => setTestDocId(e.target.value)} placeholder="Paste document UUID" className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowTestDialog(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleTestRun} disabled={running || !testDocId.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {running ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
