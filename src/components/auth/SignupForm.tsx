import { useState } from 'react';
import { useContext } from 'react';
import AuthContext from '../../contexts/AuthContext';

const SignupForm: React.FC = () => {
  const { signup, error: authError } = useContext(AuthContext)!;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await signup({ email, name, password });
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0c0d12] p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h2 className="text-lg font-bold text-white">Create Account</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
              Full name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg border border-white/[0.2] bg-[#1a1d21] text-white focus:outline-none focus:ring-2 focus:ring-[#5e6ad2]"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg border border-white/[0.2] bg-[#1a1d21] text-white focus:outline-none focus:ring-2 focus:ring-[#5e6ad2]"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg border border-white/[0.2] bg-[#1a1d21] text-white focus:outline-none focus:ring-2 focus:ring-[#5e6ad2]"
              placeholder="Create a password"
            />
          </div>
          
          {(error || authError) && (
            <p className="text-sm text-red-400">{error || authError}</p>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg bg-[#5e6ad2] text-white font-medium hover:bg-[#6b73dd] disabled:bg-[#3a426e] disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        
        <div className="text-center text-sm text-[#8a8f98] mt-4">
          <p>Already have an account? <span className="text-[#5e6ad2] hover:text-white cursor-pointer" onClick={() => { window.dispatchEvent(new CustomEvent('show-login')); }}>Sign in</span></p>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;