/**
 * Role-Based Redirect Middleware
 * À utiliser côté client pour rediriger selon le rôle
 *
 * Note: Ceci est du code client, le vrai middleware de redirection
 * doit être dans le middleware.ts à la racine du projet
 */

import { getRedirectPath } from '~/lib/role-based-routes';
import type { UserType } from '~/contexts';

export function shouldRedirect(userType: UserType, pathname: string): string | null {
  return getRedirectPath(userType, pathname);
}
