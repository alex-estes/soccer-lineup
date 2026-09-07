import { Link } from 'react-router-dom';

// Placeholder for the routing skeleton — the real formation-config UI
// (steppers bound to settings.defaultFormation, Reset All) lands in a
// later pass.
export function SettingsPage() {
  return (
    <div className="main fade-in">
      <main className="content">
        <div className="content-header">
          <Link to="/">&larr; Back</Link>
          <h2>Settings</h2>
        </div>
        <p>Formation settings coming soon.</p>
      </main>
    </div>
  );
}
