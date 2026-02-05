/**
 * Types for the FigJam Schema Explorer widget
 */

// --- Schema data (input from export script) ---

export interface SchemaField {
  name: string;
  type: string;          // "string", "integer", "boolean", "object", "array"
  format?: string;       // "date", "date-time", "email", etc.
  description?: string;
  enum?: string[];
  required?: boolean;
  ref?: string;          // Schema name this field references
}

export interface SchemaInfo {
  name: string;
  source: string;        // e.g. "openapi/components/application.yaml"
  description?: string;
  fields: SchemaField[];
}

export interface SchemaRelationship {
  from: string;          // Schema name
  to: string;            // Schema name
  field: string;         // Property name that creates the relationship
  type: 'contains' | 'references' | 'extends';
}

export interface SchemaBundle {
  schemas: Record<string, SchemaInfo>;
  relationships: SchemaRelationship[];
  exportedAt: string;
}

// --- Proposals (user annotations) ---

export type ProposalAction =
  | 'addField'
  | 'removeField'
  | 'changeType'
  | 'rename'
  | 'addEnumValue'
  | 'question'
  | 'note';

export interface Proposal {
  id: string;
  action: ProposalAction;
  schemaName: string;
  fieldName?: string;       // Existing field path (for remove, changeType, rename, addEnumValue)
  proposedName?: string;    // For addField, rename
  proposedType?: string;    // For addField, changeType
  proposedValue?: string;   // For addEnumValue
  description: string;      // Rationale or question text
  author: string;
  createdAt: string;
  votes: number;
  replies: ProposalReply[];
}

export interface ProposalReply {
  text: string;
  author: string;
  createdAt: string;
}

export interface ProposalExport {
  source: string;
  exportedAt: string;
  exportedBy: string;
  proposals: Proposal[];
}

// --- Widget state ---

export interface WidgetState {
  schemaName: string;
  expanded: boolean;
  expandedSections: string[];   // Which field groups are expanded
}

// --- Messages between widget and UI ---

export type WidgetToUIMessage =
  | { type: 'init'; schemas: SchemaBundle; proposals: Proposal[] }
  | { type: 'proposals-updated'; proposals: Proposal[] };

export type UIToWidgetMessage =
  | { type: 'load-data'; data: SchemaBundle }
  | { type: 'add-proposal'; proposal: Omit<Proposal, 'id' | 'createdAt' | 'votes' | 'replies'> }
  | { type: 'export-proposals' }
  | { type: 'set-schema'; schemaName: string };
