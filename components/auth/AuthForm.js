'use client';

import { useEffect, useState } from 'react';
import RoleSwitcher from './RoleSwitcher';
import TextInput from './TextInput';
import PasswordInput from './PasswordInput';
import { ROLE_NAMES } from '@/lib/authData';

const messages = {
  login: {
    admin: 'Admin sign-in simulated successfully. Your administration dashboard would open next.',
    faculty: 'Faculty sign-in simulated successfully. Your announcement workspace would open next.',
    student: 'Student sign-in simulated successfully. Your campus updates feed would open next.',
  },
  register: {
    faculty: 'Faculty registration simulated successfully. Your faculty profile has been prepared.',
    student: 'Student registration simulated successfully. Your student profile has been prepared.',
  },
};

const INITIAL_STATE = {
  identifier: '',
  password: '',
  fullName: '',
  employeeId: '',
  studentId: '',
  department: '',
  email: '',
  confirmPassword: '',
  year: '',
  remember: false,
  terms: false,
};

export default function AuthForm({ page, mode, fields, showForgot, showTerms, bottomText, bottomLink }) {
  const [formState, setFormState] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const role = page.role;
  const roleName = ROLE_NAMES[role];

  const rememberKey = `notifyhub-remember-${role}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(rememberKey);
    setFormState((prev) => ({ ...prev, remember: stored === 'true' }));
  }, [rememberKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(rememberKey, String(formState.remember));
  }, [formState.remember, rememberKey]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setFormState((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const passwordError = (value) => {
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/\d/.test(value)) return 'Password must include at least one number.';
    if (mode === 'register' && !/[!@#$%^&*(),.?":{}|<>_\-\\[\]/+=~`]/.test(value)) {
      return 'Password must include at least one special character.';
    }
    return '';
  };

  const validateField = (name, value) => {
    if (name === 'terms' && showTerms && !value) return 'You must agree before continuing.';
    if (name === 'year' && mode === 'register' && page.role === 'student' && !value) return 'Please select your year.';
    if (name === 'identifier' && !value.trim()) return `${page.mode === 'login' ? 'Email or Username' : 'Identifier'} is required.`;
    if (name === 'email' && (!value.trim() || !validateEmail(value))) return 'Enter a valid email address.';
    if ((name === 'password' || name === 'confirmPassword') && mode === 'register' && !value) return 'Password is required.';
    if (name === 'password' && value) return passwordError(value);
    if (name === 'confirmPassword' && value && value !== formState.password) return 'Passwords do not match.';
    if (name === 'fullName' && value && value.trim().length < 3) return 'Full Name must be at least 3 characters.';
    if ((name === 'employeeId' || name === 'studentId' || name === 'department') && value && value.trim().length < 3) return `${name === 'employeeId' ? 'Faculty/Employee ID' : name === 'studentId' ? 'Student ID' : 'Department'} must be at least 3 characters.`;
    return '';
  };

  const validateForm = () => {
    const nextErrors = {};
    fields.forEach((field) => {
      const value = formState[field.name] ?? '';
      const error = validateField(field.name, value);
      if (error) nextErrors[field.name] = error;
    });
    if (showTerms && !formState.terms) nextErrors.terms = 'You must agree before continuing.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAlert(null);

    if (!validateForm()) {
      setAlert({ type: 'error', message: 'Please review the highlighted fields and try again.' });
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSubmitting(false);

    setAlert({ type: 'success', message: messages[mode][role] });
    if (mode === 'register') {
      setFormState(INITIAL_STATE);
    }
  };

  const formTitle = page.title;

  const buttonLabel = isSubmitting ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Login' : 'Register';

  return (
    <div className="grid gap-8 rounded-[28px] bg-white/95 p-8 shadow-soft ring-1 ring-slate-200 sm:p-10">
      <RoleSwitcher activeRole={role} mode={mode} />
      <div className="space-y-4">
        <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">{page.panelLabel}</span>
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{formTitle}</h1>
          <p className="max-w-2xl text-slate-600">{page.subtitle}</p>
        </div>
      </div>
      {alert ? (
        <div className={`rounded-2xl border p-4 text-sm ${alert.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {alert.message}
        </div>
      ) : null}
      <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
        {fields.map((field) => {
          if (field.type === 'password') {
            return (
              <PasswordInput
                key={field.name}
                label={field.label}
                name={field.name}
                value={formState[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                required={field.required}
                error={errors[field.name]}
              />
            );
          }

          if (field.type === 'select') {
            return (
              <TextInput key={field.name} label={field.label} name={field.name} type={field.type} value={formState[field.name]} onChange={handleChange} error={errors[field.name]} required={field.required}>
                <option value="">Select year</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </TextInput>
            );
          }

          return (
            <TextInput
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type}
              value={formState[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              required={field.required}
              error={errors[field.name]}
            />
          );
        })}

        {page.mode === 'login' ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="remember" checked={formState.remember} onChange={handleChange} className="h-5 w-5 rounded-lg border border-slate-300 text-primary shadow-sm focus:ring-4 focus:ring-primary/20" />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-sm font-semibold text-primary hover:underline">Forgot password?</a>
          </div>
        ) : null}

        {showTerms ? (
          <>
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="terms" checked={formState.terms} onChange={handleChange} className="mt-1 h-5 w-5 rounded-lg border border-slate-300 text-primary shadow-sm focus:ring-4 focus:ring-primary/20" />
              <span className="leading-6">I agree to the terms and conditions for NotifyHub access.</span>
            </label>
            <p className="min-h-[1.25rem] text-sm text-rose-600">{errors.terms}</p>
          </>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-[#0d55b2] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
          {buttonLabel}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        {bottomText}{' '}
        {bottomLink ? (
          <a href={bottomLink.href} className="font-semibold text-primary hover:underline">
            {bottomLink.label}
          </a>
        ) : null}
      </p>
    </div>
  );
}
