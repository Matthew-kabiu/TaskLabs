'use client';

import { createContext, useContext } from 'react';

const AppTimeZoneContext = createContext<string | null>(null);

export function AppTimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <AppTimeZoneContext.Provider value={timeZone}>
      {children}
    </AppTimeZoneContext.Provider>
  );
}

export function useAppTimeZone() {
  const timeZone = useContext(AppTimeZoneContext);
  if (!timeZone) throw new Error('AppTimeZoneProvider is missing');
  return timeZone;
}
