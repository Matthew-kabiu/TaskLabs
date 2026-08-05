import { DashboardClient } from '../dashboard-client';

export default function DashboardPage() {
  const timeZone = process.env.BACKUP_TIMEZONE;
  if (!timeZone) throw new Error('Missing environment variable BACKUP_TIMEZONE');
  return <DashboardClient timeZone={timeZone} />;
}
