import * as React from 'react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export const AuthPanel: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isLogin) {
      if (!fullName.trim()) {
        setError('Full name is required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });

        if (signUpError) {
          if (signUpError.status === 429) {
            throw new Error('Sign up rate limit exceeded. Please try again later.');
          }
          throw signUpError;
        }

        if (data.user && !data.session) {
          setPendingVerification(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm text-center mx-auto mt-12">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Check Your Email</h2>
        <p className="text-secondary text-body-md mb-6">
          We sent a confirmation link to <strong>{email}</strong>. Please verify your email to continue.
        </p>
        <button
          onClick={() => {
            setPendingVerification(false);
            setIsLogin(true);
          }}
          className="text-primary font-label-md hover:underline"
        >
          Return to login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm mx-auto my-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
          {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
        </div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          {isLogin ? 'Sign in to HackSync' : 'Create an Account'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-secondary" htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
              placeholder="e.g. Jane Doe"
              required={!isLogin}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm text-secondary" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm text-secondary" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        {!isLogin && (
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-secondary" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
              placeholder="••••••••"
              required={!isLogin}
              minLength={6}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary font-label-lg rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-outline-variant text-center">
        <span className="text-secondary text-body-sm mr-2">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          className="text-primary font-label-md hover:underline focus:outline-none cursor-pointer"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
};



