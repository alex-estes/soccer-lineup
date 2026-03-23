import { IconBallFootball } from '@tabler/icons-react';

export function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999, background: 'var(--dark)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px', transition: 'opacity 0.4s',
    }}>
      <div className="loader-ball">
        <IconBallFootball size={40} />
      </div>
      <div className="loader-text">Loading...</div>
    </div>
  );
}
