import type { ConceptHierarchyNode } from '../../concepts/interfaces/concept.js';

/**
 * Hierarchy node — same shape as `ConceptHierarchyNode` from the concepts
 * module. Aliased so users reading hierarchy code see the canonical name.
 */
export type HierarchyConcept = ConceptHierarchyNode;
export type Ancestor = ConceptHierarchyNode;
export type Descendant = ConceptHierarchyNode;

export interface HierarchyPath {
  path: number[];
  concepts?: ConceptHierarchyNode[];
  length?: number;
}

export interface HierarchySummary {
  total_ancestors: number;
  total_descendants: number;
  max_hierarchy_depth: number;
  unique_vocabularies: number;
  relationship_types_used: string[];
  classification_count: number;
}

export interface HierarchyEdge {
  source: number;
  target: number;
  relationship_id: string;
}

/**
 * Response from `GET /concepts/{id}/hierarchy`. The exact shape depends on
 * the `format` request parameter — `'flat'` returns `concepts` + paths,
 * `'graph'` returns `nodes` + `edges`. We type both for ergonomics; the
 * caller knows which they asked for.
 */
export interface HierarchyResult {
  format?: 'flat' | 'graph';
  concepts?: ConceptHierarchyNode[];
  paths?: HierarchyPath[];
  nodes?: ConceptHierarchyNode[];
  edges?: HierarchyEdge[];
  summary?: HierarchySummary;
}

export interface AncestorsResult {
  ancestors: Ancestor[];
  summary?: HierarchySummary;
}

export interface DescendantsResult {
  descendants: Descendant[];
  summary?: HierarchySummary;
}
