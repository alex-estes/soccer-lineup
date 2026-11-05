import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import {
  IconBrandAppleArcade, IconMathSymbols, IconSettings, IconUsersGroup, IconPencil,
  IconTrash, IconPlus, IconCirclePlus, IconCopy, IconShare, IconRefresh, IconUserMinus,
  IconDoorExit, IconShirtSport,
} from '@tabler/icons-react';
import { AppHeader } from '../../components/Shared/AppHeader';
import { Stepper } from '../../components/Shared/Stepper';
import { Button } from '../../components/Shared/Button';
import { IconButton } from '../../components/Shared/IconButton';
import { Chip } from '../../components/Shared/Chip';
import { Toggle } from '../../components/Shared/Toggle';
import { ConfirmDialog } from '../../components/Shared/ConfirmDialog';
import { FormModal } from '../../components/Shared/FormModal';
import { SportIcon } from '../../components/Shared/SportIcon';
import {
  MAX_POSITION_COUNT, MAX_ROTATIONS, MIN_ROTATIONS, playersOnField, positionColor,
  positionSkills, SPORTS,
} from '../../constants';
import { forceReload } from '../../lib/forceReload';
import { formatJoinCode } from '../../lib/joinCode';
import { deleteTeam, regenerateJoinCode, removeMember } from '../../lib/teamsApi';
import { useAppState } from '../../state/AppContext';
import subHeaderStyles from '../../components/Shared/GameSubHeader.module.css';
import styles from './SettingsPage.module.css';

interface Props {
  user: User;
  onSignOut: () => void;
}

type NameModal = { mode: 'team' } | { mode: 'add-position' } | { mode: 'rename-position'; id: string; name: string } | null;

type Confirm =
  | { kind: 'new-code' }
  | { kind: 'remove-coach'; uid: string; name: string }
  | { kind: 'leave' }
  | { kind: 'delete-team' }
  | null;

export function SettingsPage({ user, onSignOut }: Props) {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [nameModal, setNameModal] = useState<NameModal>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { team, settings } = state;
  const sport = SPORTS[team.sport];
  const skillChoices = positionSkills(team.sport);
  const isOwner = team.ownerUid === user.uid;
  const fieldWord = team.sport === 'basketball' ? 'Court' : 'Field';

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(n => (n === msg ? null : n)), 2500);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(formatJoinCode(team.joinCode));
      flash('Code copied');
    } catch {
      flash('Copy failed — select the code and copy it by hand');
    }
  }

  async function shareCode() {
    const text = `Join ${team.name} in the lineup app with code ${formatJoinCode(team.joinCode)}`;
    try {
      await navigator.share({ title: team.name, text });
    } catch {
      // Dismissed, or sharing unsupported — fall back to the clipboard silently.
    }
  }

  async function runConfirm() {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    try {
      if (c.kind === 'new-code') {
        await regenerateJoinCode(team);
        flash('New code created — the old one no longer works');
      } else if (c.kind === 'remove-coach') {
        await removeMember(team.id, c.uid);
        flash(`${c.name} removed`);
      } else if (c.kind === 'leave') {
        await removeMember(team.id, user.uid);
        navigate('/teams');
      } else if (c.kind === 'delete-team') {
        await deleteTeam(team);
        navigate('/teams');
      }
    } catch (err) {
      console.error(err);
      flash('That didn’t work. Check your connection and try again.');
    }
  }

  function handleName(name: string) {
    if (nameModal?.mode === 'team') dispatch({ type: 'RENAME_TEAM', name });
    else if (nameModal?.mode === 'add-position') dispatch({ type: 'ADD_POSITION', name });
    else if (nameModal?.mode === 'rename-position') dispatch({ type: 'UPDATE_POSITION', id: nameModal.id, patch: { name } });
    setNameModal(null);
  }

  const coaches = [...team.memberUids].sort((a, b) =>
    a === team.ownerUid ? -1 : b === team.ownerUid ? 1 : (team.memberNames[a] ?? '').localeCompare(team.memberNames[b] ?? '')
  );

  return (
    <>
      <AppHeader user={user} onSignOut={onSignOut} title={team.name} />
      <div className={subHeaderStyles.bar}>
        <div className={subHeaderStyles.left}>
          <span className={subHeaderStyles.name}>TEAM SETTINGS</span>
        </div>
      </div>

      <main className={styles.content}>
        <section className={styles.section}>
          <div className={styles.heading}>
            <SportIcon sport={team.sport} />
            <span>TEAM</span>
          </div>
          <div className={styles.list}>
            <div className={styles.row}>
              <span className={[styles.label, styles.grow].join(' ')}>{team.name}</span>
              <IconButton icon={<IconPencil size={24} />} onClick={() => setNameModal({ mode: 'team' })} title="Rename team" />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Sport</span>
              <span className={styles.value}>{sport.label}</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.heading}>
            <IconBrandAppleArcade size={24} />
            <span>GAME PLAY</span>
          </div>
          <p className={styles.hint}>
            Defaults for new games. A game already created keeps its own setup — change it from that game's settings.
          </p>
          <div className={styles.list}>
            <div className={styles.row}>
              <span className={styles.label}>Rotations</span>
              <Stepper
                value={settings.rotationCount}
                onChange={count => dispatch({ type: 'SET_ROTATION_COUNT', count })}
                min={MIN_ROTATIONS}
                max={MAX_ROTATIONS}
                label="rotations"
              />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Players on {fieldWord}</span>
              <span className={styles.value}>{playersOnField(settings.positions)}</span>
            </div>
          </div>

          <div className={styles.subheading}>
            <IconShirtSport size={20} />
            <span>POSITIONS</span>
          </div>
          <div className={styles.list}>
            {settings.positions.map((p, i) => (
              <div className={styles.positionCard} key={p.id}>
                <div className={styles.positionTop}>
                  <span className={styles.swatch} style={{ background: positionColor(i) }} />
                  <span className={[styles.label, styles.grow].join(' ')}>{p.name}</span>
                  <IconButton
                    icon={<IconPencil size={24} />}
                    onClick={() => setNameModal({ mode: 'rename-position', id: p.id, name: p.name })}
                    title={`Rename ${p.name}`}
                  />
                  <IconButton
                    icon={<IconTrash size={24} />}
                    onClick={() => dispatch({ type: 'REMOVE_POSITION', id: p.id })}
                    disabled={settings.positions.length <= 1}
                    title={`Remove ${p.name}`}
                  />
                </div>
                <div className={styles.positionBottom}>
                  {skillChoices.length > 1 ? (
                    <label className={styles.skillPick}>
                      <span>Rated by</span>
                      <select
                        className={styles.select}
                        value={p.skill}
                        onChange={e => dispatch({ type: 'UPDATE_POSITION', id: p.id, patch: { skill: e.target.value } })}
                      >
                        {skillChoices.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </label>
                  ) : <span className={styles.hint}>Players</span>}
                  <Stepper
                    value={p.count}
                    onChange={count => dispatch({ type: 'UPDATE_POSITION', id: p.id, patch: { count } })}
                    min={1}
                    max={MAX_POSITION_COUNT}
                    label={`${p.name} count`}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setNameModal({ mode: 'add-position' })}>
            <IconPlus size={24} /> Add Position
          </Button>
        </section>

        <section className={styles.section}>
          <div className={styles.heading}>
            <IconMathSymbols size={24} />
            <span>ALGORITHM</span>
          </div>
          <div className={styles.list}>
            <div className={styles.row}>
              <span className={styles.label}>Distribute Players Based on Skill</span>
              <Toggle
                checked={settings.useSkillRatings}
                onChange={enabled => dispatch({ type: 'SET_USE_SKILL_RATINGS', enabled })}
                label="Distribute Players Based on Skill"
              />
            </div>
            {settings.useSkillRatings && (
              <div className={styles.row}>
                <span className={styles.label}>Strongest Lineup in Last Rotation</span>
                <Toggle
                  checked={settings.strongFinish}
                  onChange={enabled => dispatch({ type: 'SET_STRONG_FINISH', enabled })}
                  label="Strongest Lineup in Last Rotation"
                />
              </div>
            )}
          </div>
          {settings.useSkillRatings && settings.strongFinish && (
            <p className={styles.hint}>
              Everyone still plays the same number of rotations — only when they sit changes.
            </p>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.heading}>
            <IconUsersGroup size={24} />
            <span>COACHES</span>
          </div>
          <p className={styles.hint}>
            Anyone with this code can join and edit the team. Only share it with your coaches.
          </p>
          <div className={styles.codeRow}>
            <span className={styles.code}>{formatJoinCode(team.joinCode)}</span>
            <div className={styles.codeActions}>
              <IconButton icon={<IconCopy size={24} />} onClick={copyCode} title="Copy code" />
              {typeof navigator.share === 'function' && (
                <IconButton icon={<IconShare size={24} />} onClick={shareCode} title="Share code" />
              )}
              {isOwner && (
                <IconButton icon={<IconRefresh size={24} />} onClick={() => setConfirm({ kind: 'new-code' })} title="New code" />
              )}
            </div>
          </div>
          {notice && <p className={styles.notice}>{notice}</p>}
          <div className={styles.list}>
            {coaches.map(uid => {
              const name = team.memberNames[uid] ?? 'Coach';
              return (
                <div className={styles.row} key={uid}>
                  <span className={[styles.label, styles.grow].join(' ')}>{name}{uid === user.uid ? ' (you)' : ''}</span>
                  {uid === team.ownerUid && <Chip tone="neutral">OWNER</Chip>}
                  {isOwner && uid !== user.uid && (
                    <IconButton
                      icon={<IconUserMinus size={24} />}
                      onClick={() => setConfirm({ kind: 'remove-coach', uid, name })}
                      title={`Remove ${name}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {!isOwner && (
            <Button variant="danger" onClick={() => setConfirm({ kind: 'leave' })}>
              <IconDoorExit size={24} /> Leave Team
            </Button>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.heading}>
            <IconSettings size={24} />
            <span>ADVANCED</span>
          </div>
          <span className={styles.label}>Version {__APP_VERSION__}</span>
          <div className={styles.actionRow}>
            <Button variant="secondary" onClick={forceReload}>Refresh App</Button>
            {isOwner && (
              <Button variant="danger" onClick={() => setConfirm({ kind: 'delete-team' })}>Delete Team</Button>
            )}
          </div>
        </section>
      </main>

      <FormModal
        key={nameModal ? JSON.stringify(nameModal) : 'closed'}
        open={nameModal !== null}
        onClose={() => setNameModal(null)}
        icon={nameModal?.mode === 'add-position' ? <IconCirclePlus size={24} /> : <IconPencil size={24} />}
        title={nameModal?.mode === 'team' ? 'RENAME TEAM' : nameModal?.mode === 'add-position' ? 'ADD POSITION' : 'RENAME POSITION'}
        bodyText={nameModal?.mode === 'team' ? "Enter the Team's Name" : "Enter the Position's Name"}
        placeholder={nameModal?.mode === 'team' ? 'Team Name' : 'e.g. Goalie'}
        initialValue={nameModal?.mode === 'team' ? team.name : nameModal?.mode === 'rename-position' ? nameModal.name : ''}
        confirmLabel={nameModal?.mode === 'add-position' ? 'Add Position' : 'Rename'}
        onConfirm={handleName}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'new-code' ? 'NEW TEAM CODE'
            : confirm?.kind === 'remove-coach' ? 'REMOVE COACH'
            : confirm?.kind === 'leave' ? 'LEAVE TEAM'
            : 'DELETE TEAM'
        }
        message={
          confirm?.kind === 'new-code' ? 'The current code will stop working. Coaches already on the team stay on it.'
            : confirm?.kind === 'remove-coach' ? `${confirm.name} will lose access to ${team.name}. They can only rejoin with the current code.`
            : confirm?.kind === 'leave' ? `You will lose access to ${team.name}. You can rejoin with the team code.`
            : `This permanently deletes ${team.name} — its roster, all games and all stats — for every coach. This cannot be undone.`
        }
        confirmLabel={
          confirm?.kind === 'new-code' ? 'Create New Code'
            : confirm?.kind === 'remove-coach' ? 'Remove'
            : confirm?.kind === 'leave' ? 'Leave Team'
            : 'Delete Team'
        }
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
