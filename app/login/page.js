'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function isValidEmail(e) {
    return e.toLowerCase().endsWith('.ac.in') && e.includes('@');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter your college email (must end with .ac.in)');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center mx-auto mb-4">
            <Brain size={32} color="white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Campus Brain</h1>
          <p className="text-muted mt-2 text-sm">Your unified academic intelligence hub</p>
        </div>

        <div className="card p-8 glow-border">
          <h2 className="text-xl font-semibold mb-1">Welcome</h2>
          <p className="text-muted text-sm mb-6">Sign in with your college email to access your campus knowledge network.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide">College Email *</label>
              <input
                className="input mt-1"
                type="email"
                placeholder="rollno@college.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {email && !isValidEmail(email) && (
                <p className="text-xs text-red-400 mt-1">Must be a college email ending in .ac.in</p>
              )}
              {email && isValidEmail(email) && (
                <p className="text-xs text-green-400 mt-1">✓ Valid college email</p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide">Your Name *</label>
              <input
                className="input mt-1"
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{error}</div>}

            <button className="btn w-full justify-center" disabled={loading || !isValidEmail(email) || !name.trim()}>
              {loading ? <>Signing in... <Sparkles size={16} className="animate-pulse" /></> : <>Sign In <Sparkles size={16} /></>}
            </button>
          </form>

          <div className="mt-6 p-4 bg-panel2 rounded-lg border border-border">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">Accepted formats</div>
            <div className="space-y-1 text-xs text-muted">
              <div>✓ 1602-24-733-028@vce.ac.in</div>
              <div>✓ student123@iit.ac.in</div>
              <div>✓ cs21b001@smail.iitm.ac.in</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}