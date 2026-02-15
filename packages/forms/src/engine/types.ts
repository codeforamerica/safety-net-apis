export type ComponentType =
  | 'text-input'
  | 'date-input'
  | 'radio'
  | 'select'
  | 'checkbox-group';

export type FieldWidth = 'full' | 'half' | 'third' | 'two-thirds';

export type PermissionLevel = 'editable' | 'read-only' | 'masked' | 'hidden';

export type Role = 'applicant' | 'caseworker' | 'reviewer';

export interface ShowWhen {
  field: string;
  equals?: string | number | boolean;
  not_equals?: string | number | boolean;
}

export interface FieldDefinition {
  ref: string;
  component: ComponentType;
  width?: FieldWidth;
  hint?: string;
  labels?: Record<string, string>;
  permissions?: Partial<Record<Role, PermissionLevel>>;
  show_when?: ShowWhen;
}

export interface Page {
  id: string;
  title: string;
  fields: FieldDefinition[];
}

export interface FormContract {
  form: {
    id: string;
    title: string;
    schema: string;
    pages: Page[];
  };
}
