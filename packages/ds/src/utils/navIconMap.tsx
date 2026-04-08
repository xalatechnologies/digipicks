/**
 * NavIconMap — Resolves nav icon names to DS icon components.
 * Single source of truth; used by useDashboardNav, saas-admin, monitoring.
 */

import type { ReactNode } from 'react';
import {
  HomeIcon,
  CalendarIcon,
  BookOpenIcon,
  MessageIcon,
  MessageSquareIcon,
  StarIcon,
  SettingsIcon,
  RepeatIcon,
  UsersIcon,
  BuildingIcon,
  ChartIcon,
  ClockIcon,
  CheckCircleIcon,
  OrganizationIcon,
  CreditCardIcon,
  FileTextIcon,
  ShieldIcon,
  TicketIcon,
  SearchIcon,
  ShoppingCartIcon,
} from '../primitives/icons';

const NAV_ICON_MAP: Record<string, ReactNode> = {
  home: <HomeIcon />,
  bookOpen: <BookOpenIcon />,
  calendar: <CalendarIcon />,
  repeat: <RepeatIcon />,
  message: <MessageIcon />,
  messageSquare: <MessageSquareIcon />,
  star: <StarIcon />,
  creditCard: <CreditCardIcon />,
  settings: <SettingsIcon />,
  users: <UsersIcon />,
  building: <BuildingIcon />,
  chart: <ChartIcon />,
  clock: <ClockIcon />,
  checkCircle: <CheckCircleIcon />,
  organization: <OrganizationIcon />,
  fileText: <FileTextIcon />,
  shield: <ShieldIcon />,
  ticket: <TicketIcon />,
  search: <SearchIcon />,
  shoppingCart: <ShoppingCartIcon />,
  headset: <MessageSquareIcon />,
};

export function getNavIcon(name: string): ReactNode {
  return NAV_ICON_MAP[name] ?? <HomeIcon />;
}
