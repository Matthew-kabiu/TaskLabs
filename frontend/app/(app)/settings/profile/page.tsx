'use client';

import { useQuery } from 'convex/react';
import { BACKEND_ROUTES } from '@/lib/routes';
import { TelegramSection } from './telegram-section';
import { AccountSection } from './account-section';
import { ApiKeysSection } from './api-keys-section';

type ProfileUser = {
  id: string;
  name: string | null;
  email: string | null;
  telegramBotTokenSet: boolean;
  telegramChatLinked: boolean;
  notifyLeadMinutesTask: number[];
  notifyLeadMinutesEvent: number[];
  notifyLeadCustomTask: boolean;
  notifyLeadCustomEvent: boolean;
};

export default function ProfileSettingsPage() {
  const user = useQuery(BACKEND_ROUTES.profile.get, {}) as
    | ProfileUser
    | undefined;

  if (!user) return null;

  return (
    <div className="w-full space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Profile settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal preferences and notification settings.
        </p>
      </header>

      <AccountSection initial={{ name: user.name, email: user.email ?? '' }} />

      <ApiKeysSection />

      <TelegramSection
        user={{
          id: user.id,
          name: user.name,
          telegramBotTokenSet: user.telegramBotTokenSet,
          telegramChatLinked: user.telegramChatLinked,
          notifyLeadMinutesTask: user.notifyLeadMinutesTask,
          notifyLeadMinutesEvent: user.notifyLeadMinutesEvent,
          notifyLeadCustomTask: user.notifyLeadCustomTask,
          notifyLeadCustomEvent: user.notifyLeadCustomEvent,
        }}
      />
    </div>
  );
}
