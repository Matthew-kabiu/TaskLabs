'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  Bell,
} from 'lucide-react';
import { useAuthActions } from '@convex-dev/auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface SidebarProps {
  workspaces: { id: string; name: string; isPersonal: boolean }[];
  activeWorkspaceId: string;
  currentUser?: { name?: string | null; email?: string | null };
}

export function Sidebar({ workspaces, activeWorkspaceId, currentUser }: SidebarProps) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  const navItems = [
    { href: ROUTES.app.home, icon: LayoutDashboard, label: 'Dashboard' },
    { href: ROUTES.app.tasks, icon: CheckSquare, label: 'Tasks' },
    { href: ROUTES.app.calendar, icon: Calendar, label: 'Calendar' },
  ];

  const bottomNavItems = [
    { href: ROUTES.app.settings.workspace, icon: Settings, label: 'Workspace Settings' },
    { href: ROUTES.app.notifications, icon: Bell, label: 'Notifications' },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push(ROUTES.app.login);
    router.refresh();
  };

  const userName = currentUser?.name?.trim() ?? '';
  const userEmail = currentUser?.email?.trim() ?? '';
  const userLabel = userName || userEmail || 'Account';
  const userInitial = (userName || userEmail || 'A').charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-screen shrink-0 flex-col border-r bg-muted/20 transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Header with collapse toggle */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <span className="text-sm font-medium">TaskLabs</span>
          )}
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto h-8 w-8"
              onClick={() => setIsCollapsed(false)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsCollapsed(true)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Workspace switcher */}
        <div className={cn('p-4', isCollapsed && 'hidden')}>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspaceId}
          />
        </div>

        {/* Main navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <a
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent',
                    isCollapsed && 'justify-center'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </a>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>

        {/* Bottom section with settings and notifications */}
        <div className="mt-auto border-t p-4">
          {/* Settings and Notifications */}
          <div className="flex flex-col gap-1">
            {bottomNavItems.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <a
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </a>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
          
          {/* User avatar with dropdown */}
          <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-9 gap-2',
                    isCollapsed && 'h-9 w-9 p-0'
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {userInitial}
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-1 flex-col items-start text-left">
                      <span className="text-sm font-medium">
                        {userLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {userEmail}
                      </span>
                    </div>
                  )}
                  {!isCollapsed && <ChevronRight className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(ROUTES.app.settings.profile)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
