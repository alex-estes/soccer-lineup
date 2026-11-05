import { useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconAward, IconStars, IconDiamond, IconHeartHandshake,
  IconShield, IconSwords, IconUsers, IconHeart, IconStar,
} from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getCumulativeStats, getGamesPlayed, statCell, statsColumns } from '../../lib/stats';
import { normalizeSkills, skillLetter, SKILL_MAX, SKILL_MIN } from '../../lib/skills';
import { positionColor, SPORTS, type SkillDef } from '../../constants';
import { DetailHeader } from '../../components/Shared/DetailHeader';
import { StatTile } from '../../components/Shared/StatTile';
import { Stepper } from '../../components/Shared/Stepper';
import type { SkillKey } from '../../types';
import styles from './PlayerPage.module.css';

const SKILL_ICONS: Record<string, ReactNode> = {
  defense: <IconShield size={24} />,
  offense: <IconSwords size={24} />,
  teamwork: <IconUsers size={24} />,
  kindness: <IconHeart size={24} />,
  overall: <IconStar size={24} />,
};

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

  const sport = SPORTS[state.team.sport];
  const stats = getCumulativeStats(state)[player.name];
  const skills = normalizeSkills(player.skills, state.team.sport);
  const setSkill = (skill: SkillKey) => (level: number) =>
    dispatch({ type: 'SET_PLAYER_SKILL', name: player.name, skill, level });

  const columns = statsColumns(state.settings.positions, state.games);
  const hard = sport.skills.filter(s => s.group === 'hard');
  const soft = sport.skills.filter(s => s.group === 'soft');
  const row = (s: SkillDef) => (
    <SkillRow
      key={s.key}
      icon={SKILL_ICONS[s.key] ?? <IconStar size={24} />}
      label={s.label}
      level={skills[s.key] ?? 0}
      onChange={setSkill(s.key)}
    />
  );

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
            <StatTile tone="teal" value={statCell(stats?.score)} label={sport.scoreLabel.toUpperCase()} />
            <StatTile tone="neutral" value={statCell(getGamesPlayed(state, player.name))} label="GAMES" />
          </div>
          {chunk(columns.map((p, i) => ({ p, i })), 3).map((group, gi) => (
            <div className={styles.statsRow} key={gi}>
              {group.map(({ p, i }) => (
                <StatTile
                  key={p.id}
                  tone="position"
                  color={positionColor(i)}
                  value={statCell(stats?.byPos[p.id])}
                  label={p.name.toUpperCase()}
                />
              ))}
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconStars size={24} />
            <span>SKILLS</span>
          </div>
          <div className={styles.card}>
            {soft.length > 0 && (
              <div className={styles.groupLabel}>
                <IconDiamond size={24} />
                <span>HARD SKILLS</span>
              </div>
            )}
            {hard.map(row)}
            {soft.length > 0 && (
              <>
                <div className={styles.groupLabel}>
                  <IconHeartHandshake size={24} />
                  <span>SOFT SKILLS</span>
                </div>
                {soft.map(row)}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
