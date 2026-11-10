import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClasses, type StyleProps as BaseStyleProps } from './buttonStyles';

interface StyleProps extends BaseStyleProps {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    block,
    leadingIcon,
    trailingIcon,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});

export type LinkButtonProps = StyleProps & LinkProps;

/** Enlace de navegación con apariencia de botón. */
export function LinkButton({
  variant,
  size,
  block,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, block, className })} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}
