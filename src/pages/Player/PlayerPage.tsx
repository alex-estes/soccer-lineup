import { useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconAward, IconStars, IconDiamond, IconHeartHandshake,
  IconShield, IconSwords, IconUsers, IconHeart,
} from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getCumulativeStats, getGamesPlayed, statCell } from '../../lib/stats';
import { normalizeSkills, skillLetter, SKILL_MAX, SKILL_MIN } from '../../lib/skills';
import { DetailHeader } from '../../components/Shared/DetailHeader';
import { StatTile } from '../../components/Shared/StatTile';
import { Stepper } from '../../components/Shared/Stepper';
import type { SkillKey } from '../../types';
import styles from './PlayerPage.module.css';

interface SkillRowProps {
  icon: ReactNode;
  label: string;
  level: number;
  onChange: (level: number) => void;
}

function SkillRow({ icon, label, level, onChange }: SkillRowProps) {
  return (
    <div className={styles.skillRow}>
      <span className={styles.skillLabel}>{icon}{label}</span>
      <Stepper
        value={level}
        onChange={onChange}
        min={SKILL_MIN}
        max={SKILL_MAX}
        format={skillLetter}
        label={label}
      />
    </div>
  );
}

export function PlayerPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const decoded = name ? decodeURIComponent(name) : '';
  const player = state.players.find(p => p.name === decoded);

  // Only redirect once Firestore's first snapshot has landed — state.players is
  // [] on the very first render, so a deep link would otherwise always bounce.
  useEffect(() => {
    if (state.isLoaded && !player) navigate('/', { replace: true });
  }, [state.isLoaded, player, navigate]);

  if (!player) return null;

  const stats = getCumulativeStats(state)[player.name];
  const skills = normalizeSkills(player.skills);
  const setSkill = (skill: SkillKey) => (level: number) =>
    dispatch({ type: 'SET_PLAYER_SKILL', name: player.name, skill, level });

  return (
    <>
      <DetailHeader title={player.name} />
      <main className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconAward size={24} />
            <span>PLAYER STATS</span>
          </div>
          <div className={styles.statsRow}>
            <StatTile tone="teal" value={statCell(stats?.goals)} label="GOALS" />
            <StatTile tone="neutral" value={statCell(getGamesPlayed(state, player.name))} label="GAMES" />
          </div>
          <div className={styles.statsRow}>
            <StatTile tone="def" value={statCell(stats?.def)} label="DEF" />
            <StatTile tone="mid" value={statCell(stats?.mid)} label="MID" />
            <StatTile tone="fwd" value={statCell(stats?.fwd)} label="FWD" />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconStars size={24} />
            <span>SKILLS</span>
          </div>
          <div className={styles.card}>
            <div className={styles.groupLabel}>
              <IconDiamond size={24} />
              <span>HARD SKILLS</span>
            </div>
            <SkillRow icon={<IconShield size={24} />} label="Defense" level={skills.defense} onChange={setSkill('defense')} />
            <SkillRow icon={<IconSwords size={24} />} label="Offense" level={skills.offense} onChange={setSkill('offense')} />
            <div className={styles.groupLabel}>
              <IconHeartHandshake size={24} />
              <span>SOFT SKILLS</span>
            </div>
            <SkillRow icon={<IconUsers size={24} />} label="Teamwork" level={skills.teamwork} onChange={setSkill('teamwork')} />
            <SkillRow icon={<IconHeart size={24} />} label="Kindness" level={skills.kindness} onChange={setSkill('kindness')} />
          </div>
        </section>
      </main>
    </>
  );
}
