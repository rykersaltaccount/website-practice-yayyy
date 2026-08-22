import { useState, useContext } from 'react';
import AuthContext from '../../contexts/AuthContext';

interface UpdatePasswordFormProps {
  onComplete: () => void;
}

const UpdatePasswordForm = ({ onComplete }: UpdatePasswordFormProps) => {
  const { updatePassword, error: authError } = useContext(AuthContext)!;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const wasUpdated = await updatePassword(password);
    setIsLoading(false);

    if (wasUpdated) onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0c0d12] p-8 shadow-2xl space-y-6">
        <div className="border-b border-white/[0.08] pb-3">
          <h2 className="text-lg font-bold text-white">Choose a new password</h2>
          <p className="mt-1 text-sm text-[#8a8f98]">Set a new password for your CodeVault account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-white">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              disabled={isLoading}
              minLength={6}
              required
              className="w-full rounded-lg border border-white/[0.2] bg-[#1a1d21] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#5e6ad2]"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-white">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              disabled={isLoading}
              minLength={6}
              required
              className="w-full rounded-lg border border-white/[0.2] bg-[#1a1d21] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#5e6ad2]"
            />
          </div>

          {(error || authError) && <p className="text-sm text-red-400">{error || authError}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[#5e6ad2] px-4 py-3 font-medium text-white transition-colors hover:bg-[#6b73dd] disabled:cursor-not-allowed disabled:bg-[#3a426e]"
          >
            {isLoading ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordForm;