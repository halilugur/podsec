import { useState } from 'react';
import { X, Plus, Loader } from 'lucide-react';

function CreateSecretModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !data.trim()) {
      setError('Name and data are required');
      return;
    }

    // Validate secret name according to Podman requirements
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 253) {
      setError('Secret name must be between 1 and 253 characters');
      return;
    }

    if (/[=\/,\0]/.test(trimmedName)) {
      setError('Secret name cannot contain =, /, or , characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate(trimmedName, data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Create New Secret</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Secret Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Secret Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-secret"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Must be 1-253 characters. Cannot contain: = / , (comma)
              </p>
            </div>

            {/* Secret Data */}
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-300 mb-2">
                Secret Data *
              </label>
              <textarea
                id="data"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Enter secret content (password, API key, certificate, etc.)"
                rows={6}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                The secret data will be securely stored and cannot be retrieved later
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Secret
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSecretModal;
