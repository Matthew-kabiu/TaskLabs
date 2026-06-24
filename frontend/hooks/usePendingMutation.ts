'use client';

import { useCallback, useState } from 'react';

export type MutationResult<TResult, TVariables> = {
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  mutate: (variables: TVariables) => void;
  isPending: boolean;
};

export function usePendingMutation<TResult, TVariables>(
  run: (variables: TVariables) => Promise<TResult>,
): MutationResult<TResult, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      try {
        return await run(variables);
      } finally {
        setIsPending(false);
      }
    },
    [run],
  );
  const mutate = useCallback(
    (variables: TVariables) => {
      void mutateAsync(variables);
    },
    [mutateAsync],
  );
  return { mutateAsync, mutate, isPending };
}
