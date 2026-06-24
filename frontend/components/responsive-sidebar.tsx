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
  X,
  Bell,
  Building2,
  UserCog,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { useNotifications } from '@/hooks/useNotifications';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface ResponsiveSidebarProps {
  workspaces: { id: string; name: string; isPersonal: boolean }[];
  activeWorkspaceId: string;
  currentUser?: { name?: string | null; email?: string | null };
}

export function ResponsiveSidebar({
  workspaces,
  activeWorkspaceId,
  currentUser,
}: ResponsiveSidebarProps) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { unreadCount } = useNotifications();
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { href: ROUTES.app.home, icon: LayoutDashboard, label: 'Dashboard' },
    { href: ROUTES.app.tasks, icon: CheckSquare, label: 'Tasks' },
    { href: ROUTES.app.calendar, icon: Calendar, label: 'Calendar' },
  ];

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    router.push(ROUTES.app.login);
    router.refresh();
  };

  const userName = currentUser?.name?.trim() ?? '';
  const userEmail = currentUser?.email?.trim() ?? '';
  const userLabel = userName || userEmail || 'Account';
  const userInitial = (userName || userEmail || 'A').charAt(0).toUpperCase();

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        {!isCollapsed && !isMobile && (
          <span className="text-sm font-medium">TaskLabs</span>
        )}
        {isMobile && (
          <span className="text-base font-semibold">TaskLabs</span>
        )}
        {isCollapsed && !isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto h-8 w-8"
            onClick={() => setIsCollapsed(false)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        {!isCollapsed && !isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Workspace switcher */}
      <div className={cn('p-4', isCollapsed && !isMobile && 'hidden')}>
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
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent',
                  isCollapsed && !isMobile && 'justify-center',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(!isCollapsed || isMobile) && <span>{item.label}</span>}
              </a>
            </TooltipTrigger>
            {isCollapsed && !isMobile && (
              <TooltipContent side="right">{item.label}</TooltipContent>
            )}
          </Tooltip>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-1 border-t p-4">
        {/* Notifications — single row matching nav-link style */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={ROUTES.app.notifications}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'relative flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent',
                isCollapsed && !isMobile && 'justify-center',
              )}
            >
              <span className="relative inline-flex">
                <Bell className="h-4 w-4 shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] font-semibold tabular-nums text-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              {(!isCollapsed || isMobile) && <span>Notifications</span>}
            </a>
          </TooltipTrigger>
          {isCollapsed && !isMobile && (
            <TooltipContent side="right">Notifications</TooltipContent>
          )}
        </Tooltip>

        {/* Workspace settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={ROUTES.app.settings.workspace}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent',
                isCollapsed && !isMobile && 'justify-center',
              )}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobile) && (
                <span>Workspace settings</span>
              )}
            </a>
          </TooltipTrigger>
          {isCollapsed && !isMobile && (
            <TooltipContent side="right">Workspace settings</TooltipContent>
          )}
        </Tooltip>

        {/* User avatar with dropdown — aligned with the nav links above */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center gap-3 rounded px-2 py-2 text-left text-sm hover:bg-accent',
                isCollapsed && !isMobile && 'justify-center',
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
                {userInitial}
              </span>
              {(!isCollapsed || isMobile) && (
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium leading-tight">
                    {userLabel}
                  </span>
                  <span className="truncate text-[11px] leading-tight text-muted-foreground">
                    {userEmail}
                  </span>
                </span>
              )}
              {(!isCollapsed || isMobile) && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                router.push(ROUTES.app.settings.profile);
                setMobileOpen(false);
              }}>
                <UserCog className="mr-2 h-4 w-4" />
                Profile settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <>
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'sticky top-0 z-30 hidden h-screen shrink-0 self-start flex-col overflow-hidden border-r bg-muted/20 transition-[width] duration-300 md:flex',
            isCollapsed ? 'w-16' : 'w-60',
          )}
        >
          {renderSidebarContent()}
        </aside>

        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              {renderSidebarContent(true)}
            </SheetContent>
          </Sheet>
          <span className="text-base font-semibold">TaskLabs</span>
          <div className="w-10" />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background md:hidden">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          ))}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              {renderSidebarContent(true)}
            </SheetContent>
          </Sheet>
        </nav>
      </>
    </TooltipProvider>
  );
}
