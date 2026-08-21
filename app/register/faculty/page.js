import AuthForm from '@/components/auth/AuthForm';
import { registerPages } from '@/lib/authData';

const page = registerPages.faculty;

export default function FacultyRegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-8 lg:py-16">
      <section className="grid w-full gap-10 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,520px)]">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 to-primary p-10 text-white shadow-soft sm:p-12">
          <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-100">Faculty Registration</div>
          <h1 className="mt-8 text-4xl font-black tracking-tight">Create your faculty account</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-200">Configure a faculty profile to publish course-related notices, event updates, and department announcements with confidence.</p>
          <div className="mt-10 space-y-4">
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Targeted messaging</strong>
              <span className="mt-2 block text-sm text-slate-200">Reach the right students with the right updates.</span>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Department identity</strong>
              <span className="mt-2 block text-sm text-slate-200">Keep announcements tied to academic context.</span>
            </div>
            <div className="rounded-3xl bg-white/10 p-5">
              <strong className="block text-base font-semibold">Professional flow</strong>
              <span className="mt-2 block text-sm text-slate-200">Maintain a polished communication experience.</span>
            </div>
          </div>
        </div>
        <AuthForm page={page} mode="register" fields={page.fields} showForgot={false} showTerms bottomText={page.bottomText} bottomLink={page.bottomLink} />
      </section>
    </main>
  );
}
