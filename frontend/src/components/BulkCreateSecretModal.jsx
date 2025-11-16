import { useState } from 'react';
import { X, Upload, Loader, AlertCircle, CheckCircle } from 'lucide-react';

function BulkCreateSecretModal({ onClose, onCreate }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) {
      return;
    }

    // Parse input - format: name=value (one per line)
    const lines = input.trim().split('\n').filter(line => line.trim());
    const secrets = [];
    const errors = [];

    lines.forEach((line, index) => {
      const [name, ...dataParts] = line.split('=');
      const data = dataParts.join('='); // rejoin in case value contains =
      
      if (!name || !data) {
        errors.push(`Line ${index + 1}: Invalid format (use name=value)`);
      } else {
        secrets.push({ name: name.trim(), data: data.trim() });
      }
    });

    if (errors.length > 0) {
      setResults({ success: [], failed: errors.map(e => ({ error: e })) });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const result = await onCreate(secrets);
      setResults(result);
    } catch (err) {
      setResults({ success: [], failed: [{ error: err.message }] });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="relative bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Bulk Create Secrets</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="input" className="block text-sm font-medium text-gray-300 mb-2">
                Secrets (one per line: name=value)
              </label>
              <textarea
                id="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="API_KEY=my-secret-key&#10;DB_PASSWORD=secure-password&#10;TOKEN=jwt-token-value"
                rows={12}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Format: SECRET_NAME=secret_value (one per line). Names must be 1-253 chars, no =, /, or commas.
              </p>
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-2">
                {results.success?.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">
                        {results.success.length} secret{results.success.length !== 1 ? 's' : ''} created successfully
                      </span>
                    </div>
                    <ul className="text-sm text-green-300 space-y-1">
                      {results.success.map((s, i) => (
                        <li key={i} className="font-mono">✓ {s.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.failed?.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">
                        {results.failed.length} failed
                      </span>
                    </div>
                    <ul className="text-sm text-red-300 space-y-1">
                      {results.failed.map((f, i) => (
                        <li key={i} className="font-mono">✗ {f.name || 'Error'}: {f.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {results ? 'Close' : 'Cancel'}
            </button>
            {!results && (
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
                    <Upload className="w-4 h-4" />
                    Create Secrets
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkCreateSecretModal;
