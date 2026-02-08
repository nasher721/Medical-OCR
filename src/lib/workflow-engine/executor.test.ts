import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from './executor';
import type { SerializedNode, SerializedEdge } from './types';

describe('WorkflowExecutor topologicalSort', () => {
  it('sorts nodes in dependency order', () => {
    const executor = new WorkflowExecutor({} as never);

    const nodes: SerializedNode[] = [
      { node_id: 'a', type: 'upload', position: { x: 0, y: 0 }, config: {} },
      { node_id: 'b', type: 'extract', position: { x: 0, y: 0 }, config: {} },
      { node_id: 'c', type: 'review', position: { x: 0, y: 0 }, config: {} },
    ];
    const edges: SerializedEdge[] = [
      { edge_id: 'e1', source: 'a', target: 'b' },
      { edge_id: 'e2', source: 'b', target: 'c' },
    ];

    (executor as unknown as { nodes: SerializedNode[] }).nodes = nodes;
    (executor as unknown as { edges: SerializedEdge[] }).edges = edges;

    const sorted = (executor as unknown as { topologicalSort: () => SerializedNode[] }).topologicalSort();
    expect(sorted.map((node) => node.node_id)).toEqual(['a', 'b', 'c']);
  });
});
