from typing import Any

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    node_type: str
    label: str
    attributes: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str
    attributes: dict[str, Any] = Field(default_factory=dict)


class GraphStatistics(BaseModel):
    node_count: int
    edge_count: int
    node_types: dict[str, int] = Field(default_factory=dict)
    relationship_types: dict[str, int] = Field(default_factory=dict)


class GraphImpactAnalysis(BaseModel):
    root_node_id: str
    reachable_node_count: int
    affected_nodes: list[GraphNode] = Field(default_factory=list)
    affected_relationships: list[str] = Field(default_factory=list)
    critical_paths: list[list[str]] = Field(default_factory=list)


class KnowledgeGraphOverview(BaseModel):
    statistics: GraphStatistics
    sample_nodes: list[GraphNode] = Field(default_factory=list)
    sample_edges: list[GraphEdge] = Field(default_factory=list)


class GraphNodeDetail(BaseModel):
    node: GraphNode
    neighbors: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    impact_analysis: GraphImpactAnalysis


class GraphPathResult(BaseModel):
    path_found: bool
    path_nodes: list[GraphNode] = Field(default_factory=list)
    path_edges: list[GraphEdge] = Field(default_factory=list)
    explanation: str


class GraphNeighborhoodResult(BaseModel):
    center: GraphNode
    depth: int
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    impact_analysis: GraphImpactAnalysis
