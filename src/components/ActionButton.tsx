'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { Result } from '@/lib/services/common';
import { useRun } from './Toast';

export function ActionButton({ action, children, className = 'btn-secondary btn-sm', confirmar, deshacer, disabled }: {
  action: () => Promise<Result<any>>; children: ReactNode; className?: string; confirmar?: string; deshacer?: () => Promise<Result<any>>; disabled?: boolean;
}) {
  const { run, pending } = useRun();
  return (
    <button
      type="button" className={clsx(className)} disabled={pending || disabled}
      onClick={() => { if (confirmar && !window.confirm(confirmar)) return; run(action, { deshacer }); }}
    >
      {pending ? 'Un momento…' : children}
    </button>
  );
}
