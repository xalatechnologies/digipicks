/**
 * Specific Icons
 * 
 * Common icons used in the header
 */


import { Icon } from './icon';

// Sun Icon
export const SunIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Icon>
);

// Moon Icon
export const MoonIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
);

// Search Icon
export const SearchIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </Icon>
);

// Globe Icon
export const GlobeIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);

// User Icon
export const UserIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

// Log Out Icon
export const LogOutIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Icon>
);

// Filter Icon
export const FilterIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Icon>
);

// Grid Icon
export const GridIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </Icon>
);

// List Icon
export const ListIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </Icon>
);

// Map Icon
export const MapIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 6 16 10 8 6 1 6" />
    <line x1="8" y1="6" x2="8" y2="18" />
    <line x1="16" y1="10" x2="16" y2="22" />
  </Icon>
);

// Map Pin Icon
export const MapPinIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

// Calendar Icon
export const CalendarIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icon>
);

// People Icon
export const PeopleIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

// Shopping Cart Icon
export const ShoppingCartIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </Icon>
);

// Bell/Notification Icon
export const BellIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);

// Heart Icon
export const HeartIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Icon>
);

// Settings/Cog Icon
export const SettingsIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);

// Check Icon - for completed steps, services list
export const CheckIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

// Phone Icon - for contact info
export const PhoneIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

// Mail Icon - for contact info
export const MailIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </Icon>
);

// Clock Icon - for opening hours
export const ClockIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

// Share Icon - for sharing listings
export const ShareIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Icon>
);

// Chevron Left Icon - for navigation
export const ChevronLeftIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

// Chevron Right Icon - for navigation
export const ChevronRightIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);

// Projector Icon - for facilities
export const ProjectorIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="2" y="7" width="20" height="10" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <line x1="4" y1="17" x2="6" y2="20" />
    <line x1="20" y1="17" x2="18" y2="20" />
  </Icon>
);

// WiFi Icon - for facilities
export const WifiIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </Icon>
);

// Board/Whiteboard Icon - for facilities
export const BoardIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="14" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="17" x2="9" y2="21" />
    <line x1="15" y1="17" x2="15" y2="21" />
    <line x1="6" y1="21" x2="18" y2="21" />
  </Icon>
);

// Video Icon - for video conferencing facilities
export const VideoIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Icon>
);

// Info Icon - for tips and information boxes
export const InfoIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Icon>
);

// Close/X Icon - for closing modals
export const CloseIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

// Sparkles Icon - for description sections
export const SparklesIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </Icon>
);

// Users Icon - for capacity info
export const UsersIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

// Check Circle Icon - for success states
export const CheckCircleIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Icon>
);

// Star Icon - for ratings
export const StarIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Icon>
);

// Shield Icon - for trust/security badges
export const ShieldIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);

// Shield Check Icon - for security features
export const ShieldCheckIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

// Platform/Grid Icon - for platform features
export const PlatformIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </Icon>
);

// Automation/Cog Icon - for automation features
export const AutomationIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M12 2v4" />
    <path d="m6.8 15-3.5 2" />
    <path d="m20.7 17-3.5-2" />
    <path d="M6.8 9 3.3 7" />
    <path d="m20.7 7-3.5 2" />
    <circle cx="12" cy="12" r="4" />
  </Icon>
);

// Trend Up Icon - for positive trends
export const TrendUpIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </Icon>
);

// Trend Down Icon - for negative trends
export const TrendDownIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </Icon>
);

// Download Icon - for downloads
export const DownloadIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);

// More/Dots Icon - for action menus
export const MoreVerticalIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </Icon>
);

// Home Icon - for dashboard/home navigation
export const HomeIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </Icon>
);

// Building Icon - for organizations/listings
export const BuildingIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M16 14h.01" />
  </Icon>
);

// Sport Icon - for sports/activities
export const SportIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 1 0 20" />
    <path d="M12 2c-2.5 3.5-2.5 8.5 0 12s2.5 8.5 0 12" />
    <path d="M2 12h20" />
    <path d="M12 2v20" />
  </Icon>
);

// Inbox Icon - for messages/requests
export const InboxIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Icon>
);

// Book Icon - for bookings
export const BookOpenIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icon>
);

// Repeat Icon - for recurring/seasons
export const RepeatIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icon>
);

// Message Icon - for messages/chat
export const MessageIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

// Chart Icon - for reports
export const ChartIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Icon>
);

// Arrow Right Icon - for navigation
export const ArrowRightIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Icon>
);

// X Circle Icon - for error/cancel states
export const XCircleIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </Icon>
);

// Plus Icon - for add actions
export const PlusIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

// Message Square Icon - for chat/messages
export const MessageSquareIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

// Send Icon - for sending messages
export const SendIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);

// Organization Icon - for organizations/groups
export const OrganizationIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

// Edit/Pencil Icon - for edit actions
export const EditIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </Icon>
);

// Trash Icon - for delete actions
export const TrashIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </Icon>
);

// Refresh Icon - for refresh/reload actions
export const RefreshIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </Icon>
);

// Paperclip Icon - for attachments
export const PaperclipIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Icon>
);

// X Icon - for close/cancel
export const XIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

// Save Icon - for save actions
export const SaveIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </Icon>
);

// Copy Icon - for copy actions
export const CopyIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Icon>
);

// Eye Icon - for view/visibility
export const EyeIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

// =============================================================================
// Auth Provider Icons (Brand logos)
// =============================================================================

interface AuthIconProps {
  size?: number;
  className?: string;
}

// ID-porten Icon (Norwegian national identity provider)
export const IdPortenIcon = ({ size = 40, className }: AuthIconProps): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="ID-porten"
  >
    <rect width="40" height="40" rx="8" fill="#1E2B3C" />
    <path d="M20 8L12 14V26L20 32L28 26V14L20 8Z" stroke="white" strokeWidth="2" fill="none" />
    <rect x="18" y="14" width="4" height="8" fill="white" />
    <rect x="18" y="24" width="4" height="3" fill="white" />
  </svg>
);

// Microsoft Icon
export const MicrosoftIcon = ({ size = 40, className }: AuthIconProps): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Microsoft"
  >
    <rect width="40" height="40" rx="8" fill="#F3F3F3" />
    <rect x="10" y="10" width="9" height="9" fill="#F25022" />
    <rect x="21" y="10" width="9" height="9" fill="#7FBA00" />
    <rect x="10" y="21" width="9" height="9" fill="#00A4EF" />
    <rect x="21" y="21" width="9" height="9" fill="#FFB900" />
  </svg>
);

// Google Icon
export const GoogleIcon = ({ size = 40, className }: AuthIconProps): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Google"
  >
    <rect width="40" height="40" rx="8" fill="#FFFFFF" />
    <path d="M29.6 20.227c0-.709-.064-1.39-.182-2.045H20v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4" />
    <path d="M20 30c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123h-3.341v2.59A10 10 0 0020 30z" fill="#34A853" />
    <path d="M14.405 21.9c-.2-.6-.314-1.24-.314-1.9s.114-1.3.314-1.9v-2.59h-3.34A10 10 0 0010 20c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05" />
    <path d="M20 13.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C24.959 10.99 22.695 10 20 10a10 10 0 00-8.936 5.51l3.34 2.59c.787-2.364 2.991-4.123 5.596-4.123z" fill="#EA4335" />
  </svg>
);

// BankID Icon (Norwegian bank identity)
export const BankIdIcon = ({ size = 40, className }: AuthIconProps): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="BankID"
  >
    <rect width="40" height="40" rx="8" fill="#002776" />
    <path d="M12 14h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-4v-8z" fill="white" />
    <rect x="12" y="24" width="4" height="4" fill="white" />
    <rect x="20" y="14" width="4" height="14" fill="white" />
    <path d="M28 14h-4v14h4c2.2 0 4-3.1 4-7s-1.8-7-4-7z" fill="white" />
  </svg>
);

// Vipps Icon (Norwegian mobile payment)
export const VippsIcon = ({ size = 40, className }: AuthIconProps): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Vipps"
  >
    <rect width="40" height="40" rx="8" fill="#FF5B24" />
    <path
      d="M12 13L20 27L28 13"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Alert Triangle Icon
export const AlertTriangleIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icon>
);

// External Link Icon
export const ExternalLinkIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </Icon>
);

// Arrow Left Icon
export const ArrowLeftIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Icon>
);

// File Text Icon
export const FileTextIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </Icon>
);

// Clipboard List Icon
export const ClipboardListIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <line x1="12" y1="11" x2="12" y2="11.01" />
    <line x1="12" y1="16" x2="12" y2="16.01" />
    <line x1="16" y1="11" x2="16" y2="11.01" />
    <line x1="16" y1="16" x2="16" y2="16.01" />
    <line x1="8" y1="11" x2="8" y2="11.01" />
    <line x1="8" y1="16" x2="8" y2="16.01" />
  </Icon>
);

// Play Icon
export const PlayIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </Icon>
);

// Lock Icon
export const LockIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

// Unlock Icon
export const UnlockIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </Icon>
);

// Upload Icon
export const UploadIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
);

// Camera Icon
export const CameraIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Icon>
);

// Image Icon
export const ImageIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
);

// Table Icon - for table/data view
export const TableIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </Icon>
);

// Layout Grid Icon - for split view (grid + map side by side)
export const LayoutGridIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="8" height="18" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </Icon>
);

// Sort Icon - for sorting controls
export const SortIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M11 5h10" />
    <path d="M11 9h7" />
    <path d="M11 13h4" />
    <path d="m3 17 3 3 3-3" />
    <path d="M6 18V4" />
  </Icon>
);

// Maximize Icon - for full screen/expand actions
export const MaximizeIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </Icon>
);

// Accessibility Icon - for accessibility features
export const AccessibilityIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="4" r="2" />
    <path d="M12 6v6" />
    <path d="M8 8h8" />
    <path d="M9 22l3-9 3 9" />
  </Icon>
);


// Currency/Wallet Icon - for price/money
export const WalletIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </Icon>
);

// Tag Icon - for facilities/labels
export const TagIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </Icon>
);

// Menu Icon - hamburger (3 horizontal lines)
export const MenuIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </Icon>
);

// Credit Card Icon
export const CreditCardIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </Icon>
);

// Sliders Icon - for filter controls
export const SlidersIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="2" x2="6" y1="14" y2="14" />
    <line x1="10" x2="14" y1="8" y2="8" />
    <line x1="18" x2="22" y1="16" y2="16" />
  </Icon>
);

// =============================================================================
// Facility & Domain Icons
// =============================================================================

// Coffee Icon - for kitchen/beverage facilities
export const CoffeeIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
    <path d="M6 2v2" />
    <path d="M10 2v2" />
    <path d="M14 2v2" />
  </Icon>
);

// Parking Icon - for parking facilities
export const ParkingIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
  </Icon>
);

// Kitchen/Utensils Icon - for kitchen facilities
export const UtensilsIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </Icon>
);

// Air Conditioner Icon - for climate facilities
export const AirConditionerIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="2" y="4" width="20" height="8" rx="2" />
    <path d="M6 16v2" />
    <path d="M10 16v4" />
    <path d="M14 16v2" />
    <path d="M18 16v4" />
  </Icon>
);

// Toilet/Restroom Icon - for restroom facilities
export const ToiletIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M7 12h10a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4v-1a2 2 0 0 1 2-2z" />
    <path d="M12 2v4" />
    <rect x="8" y="6" width="8" height="6" rx="1" />
  </Icon>
);

// Heart Filled Icon - for favorited state
export const HeartFilledIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props} fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Icon>
);

// Alert Circle Icon - for warning states
export const AlertCircleIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </Icon>
);

// Wrench Icon - for maintenance/repair
export const WrenchIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Icon>
);

// Volume Off Icon - for noise/quiet rules
export const VolumeOffIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </Icon>
);

// Facebook Icon - social sharing
export const FacebookIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </Icon>
);

// Twitter/X Icon - social sharing
export const TwitterXIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M4 4l11.733 16h4.267l-11.733-16zM4 20l6.768-6.768M20 4l-6.768 6.768" />
  </Icon>
);

// LinkedIn Icon - social sharing
export const LinkedinIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </Icon>
);

// Instagram Icon - social sharing
export const InstagramIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </Icon>
);

// YouTube Icon - social sharing
export const YoutubeIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </Icon>
);

// TikTok Icon - social sharing
export const TiktokIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </Icon>
);

// WhatsApp Icon - social sharing
export const WhatsappIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l4.9-1.4A10 10 0 1 0 12 2z" />
  </Icon>
);

// Square Icon - for area/dimensions
export const SquareIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </Icon>
);

// ChevronDown Icon - for expandable sections
export const ChevronDownIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);

// ChevronUp Icon - for collapsible sections
export const ChevronUpIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <polyline points="18 15 12 9 6 15" />
  </Icon>
);

// Minus Icon - for quantity decrements
export const MinusIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

// Droplet Icon - for water/shower facilities
export const DropletIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  </Icon>
);

// ShirtIcon - for changing room/wardrobe facilities
export const ShirtIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </Icon>
);

// SpeakerIcon - for audio/sound system facilities
export const SpeakerIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <circle cx="12" cy="14" r="4" />
    <line x1="12" y1="6" x2="12.01" y2="6" />
  </Icon>
);

// MusicIcon - for culture/concert categories
export const MusicIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Icon>
);

// BriefcaseIcon - for business/næring categories
export const BriefcaseIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Icon>
);

// WineGlassIcon - for selskap/party categories
export const WineGlassIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M8 22h8" />
    <path d="M12 11v11" />
    <path d="M5.7 2h12.6c.3 0 .5.3.4.5l-2.5 7.8a5 5 0 0 1-8.4 0L5.3 2.5c-.1-.2.1-.5.4-.5z" />
  </Icon>
);

// TicketIcon - for tickets/admission
export const TicketIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </Icon>
);

// ElevatorIcon - for elevator facility
export const ElevatorIcon = (props: React.ComponentProps<typeof Icon>) => (
  <Icon {...props}>
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <path d="M12 6v4m0 0l2-2m-2 2l-2-2" />
    <path d="M12 18v-4m0 0l2 2m-2-2l-2 2" />
  </Icon>
);

