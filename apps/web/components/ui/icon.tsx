/**
 * Composant Icon Wrapper
 * Simplifie l'utilisation des icônes avec des props standardisées
 */

import { type LucideIcon } from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { IconSizes } from '~/config/icons.config';

interface IconProps {
  icon: LucideIcon;
  size?: keyof typeof IconSizes | number;
  className?: string;
  strokeWidth?: number;
  onClick?: () => void;
}

/**
 * Composant Icon avec sizing et styling standardisés
 *
 * @example
 * ```tsx
 * import { Icons } from '~/config/icons.config';
 * import { Icon } from '~/components/ui/icon';
 *
 * <Icon icon={Icons.navigation.dashboard} size="md" />
 * <Icon icon={Icons.status.success} size={24} className="text-green-500" />
 * ```
 */
export function Icon({
  icon: IconComponent,
  size = 'md',
  className,
  strokeWidth = 2,
  onClick,
}: IconProps) {
  const sizeValue = typeof size === 'number' ? size : IconSizes[size];

  return (
    <IconComponent
      size={sizeValue}
      strokeWidth={strokeWidth}
      className={cn('inline-block', className)}
      onClick={onClick}
    />
  );
}

/**
 * Variantes d'icônes avec couleurs pré-définies
 */
export function IconSuccess({ icon, size, className, ...props }: IconProps) {
  return (
    <Icon
      icon={icon}
      size={size}
      className={cn('text-green-500', className)}
      {...props}
    />
  );
}

export function IconError({ icon, size, className, ...props }: IconProps) {
  return (
    <Icon
      icon={icon}
      size={size}
      className={cn('text-red-500', className)}
      {...props}
    />
  );
}

export function IconWarning({ icon, size, className, ...props }: IconProps) {
  return (
    <Icon
      icon={icon}
      size={size}
      className={cn('text-orange-500', className)}
      {...props}
    />
  );
}

export function IconInfo({ icon, size, className, ...props }: IconProps) {
  return (
    <Icon
      icon={icon}
      size={size}
      className={cn('text-blue-500', className)}
      {...props}
    />
  );
}

export function IconMuted({ icon, size, className, ...props }: IconProps) {
  return (
    <Icon
      icon={icon}
      size={size}
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Badge avec icône
 */
interface IconBadgeProps {
  icon: LucideIcon;
  size?: keyof typeof IconSizes | number;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  className?: string;
}

export function IconBadge({
  icon: IconComponent,
  size = 'sm',
  variant = 'default',
  className,
}: IconBadgeProps) {
  const sizeValue = typeof size === 'number' ? size : IconSizes[size];

  const variants = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full p-2',
        variants[variant],
        className
      )}
    >
      <IconComponent size={sizeValue} strokeWidth={2} />
    </div>
  );
}

/**
 * Bouton avec icône uniquement
 */
interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  size?: keyof typeof IconSizes | number;
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function IconButton({
  icon: IconComponent,
  onClick,
  size = 'md',
  variant = 'ghost',
  className,
  disabled,
  title,
}: IconButtonProps) {
  const sizeValue = typeof size === 'number' ? size : IconSizes[size];

  const variants = {
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className
      )}
    >
      <IconComponent size={sizeValue} strokeWidth={2} />
    </button>
  );
}
