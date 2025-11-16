import { X, Trash2, Calendar, Database, Tag } from 'lucide-react';

function SecretDetailsModal({ secret, onClose, onDelete }) {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleDelete = () => {
    onDelete(secret.ID);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">{secret.Name}</h2>
            <p className="text-gray-400 text-sm mt-1 font-mono">{secret.ID}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">Name</span>
              </div>
              <p className="text-white font-medium">{secret.Name}</p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Driver</span>
              </div>
              <p className="text-white font-medium">{secret.Driver}</p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <p className="text-white font-medium text-sm">{formatDate(secret.CreatedAt)}</p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Updated</span>
              </div>
              <p className="text-white font-medium text-sm">{formatDate(secret.UpdatedAt)}</p>
            </div>
          </div>

          {/* Full ID */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <span className="text-sm font-medium">Full ID</span>
            </div>
            <p className="text-white font-mono text-xs break-all">{secret.ID}</p>
          </div>

          {/* Spec Details */}
          {secret.Spec && (
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <span className="text-sm font-medium">Specification</span>
              </div>
              <pre className="text-gray-300 text-xs overflow-x-auto bg-gray-800/50 p-3 rounded border border-gray-600">
                {JSON.stringify(secret.Spec, null, 2)}
              </pre>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              <strong>Note:</strong> Secret data cannot be retrieved for security reasons. 
              Only metadata is displayed here.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Secret
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecretDetailsModal;
