import AuthForm from '@/components/auth/AuthForm';
import { loginPages } from '@/lib/authData';

const page = loginPages.admin;

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-8 lg:py-16">
      <section className="grid w-full gap-10 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,520px)]">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 to-primary p-10 text-white shadow-soft sm:p-12">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-100">Admin Access</div>
          <h1 className="mt-8 text-4xl font-black tracking-tight">Welcome back</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-200">Securely access application controls for announcements, events, urgent alerts, and campus-wide publishing oversight.</p>
          <div className="mt-10 space-y-4">
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Broadcast control</strong>
              <span className="mt-2 block text-sm text-slate-200">Coordinate institution-wide updates with clarity.</span>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Role-based visibility</strong>
              <span className="mt-2 block text-sm text-slate-200">Keep messages targeted to the right audience.</span>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Fast response</strong>
              <span className="mt-2 block text-sm text-slate-200">Escalate urgent notices when timing matters most.</span>
            </div>
          </div>
        </div>
        <AuthForm page={page} mode="login" fields={page.fields} showForgot={page.showForgot} showTerms={false} bottomText={page.bottomText} bottomLink={page.bottomLink} />
      </section>
    </main>
  );
}
