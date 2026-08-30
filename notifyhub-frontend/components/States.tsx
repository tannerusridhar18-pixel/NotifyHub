export function Loading({ label = "Loading campus signals…" }: { label?: string }) { return <div className="state"><div className="spinner"/><p>{label}</p></div>; }
export function ErrorState({ message }: { message: string }) { return <div className="state error-state"><b>Something went wrong</b><p>{message}</p></div>; }
export function Empty({ label }: { label: string }) { return <div className="state"><div className="empty-mark">—</div><b>No {label} yet</b><p>Check back later for the next campus update.</p></div>; }
