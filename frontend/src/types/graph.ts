export interface GraphNode {
  id: string;
  node_type: string;
  label: string;
  attributes: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  attributes: Record<string, unknown>;
}

export interface GraphStatistics {
  node_count: number;
  edge_count: number;
  node_types: Record<string, number>;
  relationship_types: Record<string, number>;
}

export interface GraphImpactAnalysis {
  root_node_id: string;
  reachable_node_count: number;
  affected_nodes: GraphNode[];
  affected_relationships: string[];
  critical_paths: string[][];
}

export interface KnowledgeGraphOverview {
  statistics: GraphStatistics;
  sample_nodes: GraphNode[];
  sample_edges: GraphEdge[];
}

export interface GraphPathResult {
  path_found: boolean;
  path_nodes: GraphNode[];
  path_edges: GraphEdge[];
  explanation: string;
}

export interface GraphNeighborhoodResult {
  center: GraphNode;
  depth: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  impact_analysis: GraphImpactAnalysis;
}

export interface GraphNodeDetail {
  node: GraphNode;
  neighbors: GraphNode[];
  edges: GraphEdge[];
  impact_analysis: GraphImpactAnalysis;
}

