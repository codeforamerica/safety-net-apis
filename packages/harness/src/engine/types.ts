export type ComponentType =
  | 'text-input'
  | 'date-input'
  | 'radio'
  | 'select'
  | 'checkbox-group'
  | 'field-array';

export type FieldWidth = 'full' | 'half' | 'third' | 'two-thirds';

export type PermissionLevel = 'editable' | 'read-only' | 'masked' | 'hidden';

export type ViewMode = 'editable' | 'readonly';

export type Role = 'applicant' | 'caseworker' | 'reviewer';

/** Simple single-field condition. */
export interface SimpleCondition {
  field: string;
  equals?: string | number | boolean;
  not_equals?: string | number | boolean;
}

/**
 * JSON Logic condition for compound rules.
 * See https://jsonlogic.com for the full spec.
 */
export interface JsonLogicCondition {
  jsonlogic: Record<string, unknown>;
}

export type ShowWhen = SimpleCondition | JsonLogicCondition;

export interface FieldDefinition {
  ref: string;
  component: ComponentType;
  width?: FieldWidth;
  hint?: string;
  labels?: Record<string, string>;
  permissions?: Partial<Record<Role, PermissionLevel>>;
  show_when?: ShowWhen;
  /** Sub-fields for field-array component. */
  fields?: FieldDefinition[];
  /** Minimum number of rows (field-array). */
  min_items?: number;
  /** Maximum number of rows (field-array). */
  max_items?: number;
}

export interface Page {
  id: string;
  title: string;
  fields?: FieldDefinition[];
  /** For review layout: whether this section starts expanded (default: true). */
  expanded?: boolean;
  /** Per-page display override — if set, this page uses a different display than the form-level config. */
  display?: DisplayType;
  /** Data source for data-table pages. */
  source?: DataTableSource;
  /** Per-page column override for data-table pages. */
  columns?: ReferenceColumn[];
  /** Detail navigation config — clicking a row shows this form. */
  detail?: DetailConfig;
}

export type NavigationType = 'step-indicator' | 'side-nav' | 'in-page' | 'top-nav' | 'none';

export type DisplayType = 'paginated' | 'scrollable' | 'accordion' | 'split-panel' | 'data-table';

export interface LayoutConfig {
  navigation: NavigationType;
  display: DisplayType;
}

export type FormLayout = LayoutConfig;

export type DataTableSource = 'contract' | 'api';

export interface DetailConfig {
  /** ID of the form contract to render for the detail view. */
  form: string;
  /** API endpoint template, e.g. '/api/applications/{id}'. */
  fetch: string;
}

export interface AnnotationLayer {
  name: string;
  data: Record<string, unknown>;
}

export interface ReferenceColumn {
  from: string;
  label: string;
}

export interface PanelConfig {
  label: string;
  mode: ViewMode;
}

export interface StoryBookMeta {
  role: Role;
  permissions: string;
}

export interface FormContract {
  form: {
    id: string;
    title: string;
    schema: string;
    layout: FormLayout;
    storybook?: StoryBookMeta;
    annotations?: string[];
    columns?: ReferenceColumn[];
    panels?: { left: PanelConfig; right: PanelConfig };
    pages: Page[];
  };
}

export interface PermissionsPolicy {
  role: Role;
  defaults: PermissionLevel;
  fields?: Record<string, PermissionLevel>;
}
