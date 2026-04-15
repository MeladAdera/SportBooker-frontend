import type { LucideIcon } from 'lucide-react';
import { Dumbbell, Goal, LayoutGrid, Target, Volleyball } from 'lucide-react';

/** Lucide icons keyed by API `sportType` string (and common extras for i18n). */
const SPORT_ICON_MAP: Record<string, LucideIcon> = {
  football: Goal,
  padel: Volleyball,
  cricket: Target,
  generic: Dumbbell,
  basketball: Dumbbell,
  tennis: Volleyball,
};

export function getSportIcon(sport: string | undefined | null): LucideIcon {
  if (!sport) return Dumbbell;
  return SPORT_ICON_MAP[sport] ?? Dumbbell;
}

/** Icon for “all sports” / unfiltered sport picker. */
export const ALL_SPORTS_ICON: LucideIcon = LayoutGrid;
