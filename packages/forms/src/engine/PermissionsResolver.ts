import type { FieldDefinition, PermissionLevel, Role } from './types';

/**
 * Resolves the permission level for a field based on the user's role.
 * Defaults to 'editable' if no permissions are specified.
 */
export function resolvePermission(
  field: FieldDefinition,
  role: Role,
): PermissionLevel {
  if (!field.permissions) return 'editable';
  return field.permissions[role] ?? 'editable';
}
