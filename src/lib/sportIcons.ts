import type { IconType } from 'react-icons';
import {
  GiSoccerBall,
  GiTennisBall,
  GiCricketBat,
  GiBasketballBall,
  GiWeightLiftingUp,
} from 'react-icons/gi';
import { IoGridOutline } from 'react-icons/io5';

/** react-icons IconType keyed by API `sportType` string. */
const SPORT_ICON_MAP: Record<string, IconType> = {
  football: GiSoccerBall,
  padel: GiTennisBall,
  cricket: GiCricketBat,
  generic: GiWeightLiftingUp,
  basketball: GiBasketballBall,
  tennis: GiTennisBall,
};

export function getSportIcon(sport: string | undefined | null): IconType {
  if (!sport) return GiWeightLiftingUp;
  return SPORT_ICON_MAP[sport] ?? GiWeightLiftingUp;
}

/** Icon for "all sports" / unfiltered sport picker. */
export const ALL_SPORTS_ICON: IconType = IoGridOutline;
