import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconUser, IconDots, IconPencil, IconTrash, IconUserOff, IconUserCheck, IconChevronRight } from '@tabler/icons-react';
import { IconButton } from './IconButton';
import { DropdownMenu } from './DropdownMenu';
import { SkillRating } from './SkillRating';
import { SPORTS } from '../../constants';
import { normalizeSkills } from '../../lib/skills';
import type { Player, SportId } from '../../types';
import styles from './RosterCard.module.css';

interface Props {
  player: Player;
  sport: SportId;
  /** Off when the team has turned skill ratings off in Settings. */
  showRatings: boolean;
  onRename: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function RosterCard({ player, sport, showRatings, onRename, onDelete, onToggleActive }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Holds the ⋯ button and the menu, so a second tap on ⋯ closes it.
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const { skills: skillDefs, ratingStyle } = SPORTS[sport];
  const skills = normalizeSkills(player.skills, sport);
  // Only the ratings the lineup generator can use; soft skills stay on the player page.
  const ratings = skillDefs.filter(s => s.group === 'hard');

  const playerPath = `/player/${encodeURIComponent(player.name)}`;

  return (
    <div className={styles.card}>
      {/* Like GameCard: the icon and name open the player too, not just the chevron. */}
      <Link to={playerPath} className={styles.link}>
        <IconUser size={24} className={[styles.icon, player.active ? '' : styles.inactive].join(' ')} />
        <span className={[styles.name, player.active ? '' : styles.inactive].join(' ')}>{player.name}</span>
        {showRatings && (
          <span className={[styles.ratings, player.active ? '' : styles.inactive].join(' ')}>
            {ratings.map(s => (
              <span key={s.key} className={styles.rating}>
                <span className={styles.ratingLabel} aria-hidden>{s.abbr}</span>
                <span className={styles.srOnly}>{s.label}</span>
                <SkillRating level={skills[s.key]} ratingStyle={ratingStyle} size={18} />
              </span>
            ))}
          </span>
        )}
      </Link>
      <div ref={menuWrapRef} className={styles.menuWrap}>
        <IconButton icon={<IconDots size={24} />} onClick={() => setMenuOpen(o => !o)} title="Player options" />
        {menuOpen && (
          <DropdownMenu
            triggerRef={menuWrapRef}
            onClose={() => setMenuOpen(false)}
            items={[
              { label: 'Rename', icon: <IconPencil size={24} />, onClick: onRename },
              {
                label: player.active ? 'Mark Inactive' : 'Mark Active',
                icon: player.active ? <IconUserOff size={24} /> : <IconUserCheck size={24} />,
                onClick: onToggleActive,
              },
              { label: 'Delete Player', icon: <IconTrash size={24} />, danger: true, onClick: onDelete },
            ]}
          />
        )}
      </div>
      <Link
        to={playerPath}
        className={styles.chevronLink}
        aria-label={`View ${player.name}`}
      >
        <IconChevronRight size={24} className={styles.chevron} />
      </Link>
    </div>
  );
}
