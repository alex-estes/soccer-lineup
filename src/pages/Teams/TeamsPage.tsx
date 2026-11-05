import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import {
  IconUsersGroup, IconPlus, IconLogin2, IconChevronRight, IconCirclePlus, IconX, IconCheck,
} from '@tabler/icons-react';
import { AppHeader } from '../../components/Shared/AppHeader';
import { Button } from '../../components/Shared/Button';
import { Chip } from '../../components/Shared/Chip';
import { IconButton } from '../../components/Shared/IconButton';
import { SegmentedControl } from '../../components/Shared/SegmentedControl';
import { SportIcon } from '../../components/Shared/SportIcon';
import { SPORT_IDS, SPORTS } from '../../constants';
import { createTeam, joinTeam, JoinError } from '../../lib/teamsApi';
import type { TeamSnapshot } from '../../state/teamDoc';
import type { SportId } from '../../types';
import formStyles from '../../components/Shared/FormModal.module.css';
import homeStyles from '../Home/HomePage.module.css';
import styles from './TeamsPage.module.css';

interface Props {
  user: User;
  onSignOut: () => void;
  teams: TeamSnapshot[];
  activeId: string | null;
  loadError: string | null;
  onSelect: (teamId: string) => void;
}

type Modal = 'create' | 'join' | null;

export function TeamsPage({ user, onSignOut, teams, activeId, loadError, onSelect }: Props) {
  const navigate = useNavigate();
  const [modal, setModal] = useState<Modal>(null);
  // A team just created or joined: open it as soon as it shows up in the live list.
  const [awaiting, setAwaiting] = useState<string | null>(null);

  useEffect(() => {
    // Navigating away unmounts this page, so `awaiting` never needs clearing.
    if (awaiting && teams.some(t => t.meta.id === awaiting)) {
      onSelect(awaiting);
      navigate('/');
    }
  }, [awaiting, teams, onSelect, navigate]);

  function open(teamId: string) {
    onSelect(teamId);
    navigate('/');
  }

  return (
    <>
      <AppHeader user={user} onSignOut={onSignOut} />
      <main className={homeStyles.content}>
        <section className={homeStyles.section}>
          <div className={homeStyles.sectionHeading}>
            <div className={homeStyles.sectionTitle}>
              <IconUsersGroup size={24} />
              <span>YOUR TEAMS</span>
            </div>
          </div>
          {loadError && <p className={styles.error}>{loadError}</p>}
          <div className={homeStyles.list}>
            {teams.length === 0 ? (
              <div className={homeStyles.emptyState}>
                No teams yet. Create one, or join a team another coach shared with you.
              </div>
            ) : (
              teams.map(t => (
                <button type="button" key={t.meta.id} className={styles.card} onClick={() => open(t.meta.id)}>
                  <SportIcon sport={t.meta.sport} className={styles.icon} />
                  <span className={styles.name}>{t.meta.name}</span>
                  {t.meta.id === activeId && <Chip tone="win">OPEN</Chip>}
                  <Chip tone="neutral">{t.meta.ownerUid === user.uid ? 'OWNER' : 'COACH'}</Chip>
                  <IconChevronRight size={24} className={styles.chevron} />
                </button>
              ))
            )}
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => setModal('create')}>
              <IconPlus size={24} /> Create Team
            </Button>
            <Button variant="secondary" onClick={() => setModal('join')}>
              <IconLogin2 size={24} /> Join with Code
            </Button>
          </div>
        </section>
      </main>

      {modal === 'create' && (
        <CreateTeamModal
          onClose={() => setModal(null)}
          onCreate={async (name, sport) => {
            const id = await createTeam(user, name, sport);
            setModal(null);
            setAwaiting(id);
          }}
        />
      )}
      {modal === 'join' && (
        <JoinTeamModal
          onClose={() => setModal(null)}
          onJoin={async code => {
            const id = await joinTeam(user, code);
            setModal(null);
            setAwaiting(id);
          }}
        />
      )}
    </>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────

function ModalShell({ title, icon, onClose, children }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={formStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={formStyles.card}>
        <div className={formStyles.header}>
          <div className={formStyles.titleGroup}>
            {icon}
            <span className={formStyles.title}>{title}</span>
          </div>
          <IconButton icon={<IconX size={24} />} onClick={onClose} title="Close" />
        </div>
        {children}
      </div>
    </div>
  );
}

function useAutoFocus() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  return ref;
}

function CreateTeamModal({ onClose, onCreate }: {
  onClose: () => void; onCreate: (name: string, sport: SportId) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportId>('soccer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useAutoFocus();

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim(), sport);
    } catch (err) {
      console.error(err);
      setError('Could not create the team. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="CREATE TEAM" icon={<IconCirclePlus size={24} />} onClose={onClose}>
      <p className={formStyles.bodyText}>Name your team and pick its sport</p>
      <input
        ref={inputRef}
        className={formStyles.input}
        placeholder="Team Name"
        value={name}
        maxLength={30}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      />
      <SegmentedControl
        value={sport}
        onChange={setSport}
        options={SPORT_IDS.map(id => ({ value: id, label: SPORTS[id].label }))}
      />
      <p className={styles.hint}>The sport can't be changed later. Positions and rotations can.</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={formStyles.footer}>
        <Button variant="secondary" onClick={onClose}>Go Back</Button>
        <Button variant="primary" onClick={submit}>{busy ? 'Creating…' : 'Create Team'}</Button>
      </div>
    </ModalShell>
  );
}

function JoinTeamModal({ onClose, onJoin }: { onClose: () => void; onJoin: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useAutoFocus();

  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(code);
    } catch (err) {
      if (!(err instanceof JoinError)) console.error(err);
      setError(err instanceof JoinError ? err.message : 'Could not join. Check the code and your connection.');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="JOIN A TEAM" icon={<IconLogin2 size={24} />} onClose={onClose}>
      <p className={formStyles.bodyText}>Enter the team code another coach shared with you</p>
      <input
        ref={inputRef}
        className={[formStyles.input, styles.codeInput].join(' ')}
        placeholder="ABCD-EFGH"
        value={code}
        maxLength={12}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={formStyles.footer}>
        <Button variant="secondary" onClick={onClose}>Go Back</Button>
        <Button variant="primary" onClick={submit}>
          <IconCheck size={16} /> {busy ? 'Joining…' : 'Join Team'}
        </Button>
      </div>
    </ModalShell>
  );
}
