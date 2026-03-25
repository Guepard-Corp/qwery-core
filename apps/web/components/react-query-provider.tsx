import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '~/lib/query-client';

export function ReactQueryProvider(props: React.PropsWithChildren) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {props.children}
    </QueryClientProvider>
  );
}
