/**
 * Export centralisé des contextes
 */

export { VocabularyProvider, useVocabulary, useLabels } from './vocabulary-context';
export { UserRoleProvider, useUserRole, usePermission } from './user-role-context';
export type { UserType, OrganizationRole, UserProfile } from './user-role-context';
