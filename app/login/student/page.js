import AuthForm from '@/components/auth/AuthForm';
import { loginPages } from '@/lib/authData';

const page = loginPages.student;

export default function StudentLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-8 lg:py-16">
      <section className="grid w-full gap-10 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,520px)]">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 to-primary p-10 text-white shadow-soft sm:p-12">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-100">Student Access</div>
          <h1 className="mt-8 text-4xl font-black tracking-tight">Welcome back</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-200">Stay connected to classes, events, and urgent campus notices with a clear student-first announcement experience.</p>
          <div className="mt-10 space-y-4">
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Timely alerts</strong>
              <span className="mt-2 block text-sm text-slate-200">Never miss important campus updates.</span>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Event discovery</strong>
              <span className="mt-2 block text-sm text-slate-200">Track seminars, clubs, and academic opportunities.</span>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Simple navigation</strong>
              <span className="mt-2 block text-sm text-slate-200">Find the right information quickly on any device.</span>
            </div>
          </div>
        </div>
        <AuthForm page={page} mode="login" fields={page.fields} showForgot={page.showForgot} showTerms={false} bottomText={page.bottomText} bottomLink={page.bottomLink} />
      </section>
    </main>
  );
}
