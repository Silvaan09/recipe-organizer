import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn('rounded-lg border border-petal-100 bg-white p-4 shadow-soft', className)}
    >
      {children}
    </section>
  );
}
