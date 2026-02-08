import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowBuilderPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'workflow-1' }),
}));

const supabaseFrom = vi.fn();
const createClientMock = vi.fn(() => ({
  from: supabaseFrom,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}));

vi.mock('reactflow', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    default: ({ nodes, onNodeClick, children }: { nodes: Array<{ id: string; data: { label: string } }>; onNodeClick: (event: React.MouseEvent, node: unknown) => void; children: React.ReactNode }) => (
      <div>
        {nodes.map((node) => (
          <button key={node.id} onClick={(event) => onNodeClick(event, node)}>
            {node.data.label}
          </button>
        ))}
        {children}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Handle: () => <div data-testid="handle" />,
    Position: { Top: 'top', Bottom: 'bottom' },
    useNodesState: (initial: unknown[]) => {
      const [nodes, setNodes] = React.useState(initial);
      return [nodes, setNodes, vi.fn()];
    },
    useEdgesState: (initial: unknown[]) => {
      const [edges, setEdges] = React.useState(initial);
      return [edges, setEdges, vi.fn()];
    },
    addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
  };
});

describe('WorkflowBuilderPage', () => {
  beforeEach(() => {
    supabaseFrom.mockImplementation((table: string) => {
      if (table === 'workflows') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'workflow-1', name: 'Demo Workflow', doc_type: 'invoice', org_id: 'org-1' } }),
            }),
          }),
        };
      }
      if (table === 'workflow_nodes') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [
                {
                  node_id: 'node-1',
                  type: 'rule',
                  position: { x: 0, y: 0 },
                  config: { threshold: 0.85 },
                },
              ],
            }),
          }),
        };
      }
      if (table === 'workflow_edges') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [] }),
          }),
        };
      }
      if (table === 'workflow_runs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [] }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
    });
  });

  it('shows rule node config when a node is clicked', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilderPage />);

    const nodeButton = await screen.findByRole('button', { name: /confidence rule/i });
    await user.click(nodeButton);

    await waitFor(() => {
      expect(screen.getByText('Node Config')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toHaveValue(0.85);
    });
  });
});
