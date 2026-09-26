export default function AuthFloatingCards() {
  return (
    <div className="authkit-orbit" aria-hidden="true">
      <div className="authkit-float authkit-float-left">
        <span className="authkit-float-kicker">CAMPUS FEED</span>
        <strong>3 new announcements</strong>
        <span className="authkit-float-line" />
        <span className="authkit-float-meta">Academic · Events · Alerts</span>
      </div>
      <div className="authkit-float authkit-float-right">
        <span className="authkit-float-kicker">IDENTITY</span>
        <strong>Role-aware access</strong>
        <span className="authkit-float-line" />
        <span className="authkit-float-meta">Secure session · Protected</span>
      </div>
      <div className="authkit-orbit-ring" />
      <div className="authkit-orbit-glow" />
    </div>
  );
}
