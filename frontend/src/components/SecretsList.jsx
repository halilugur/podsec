import { Trash2, Eye, RefreshCw, Lock, Calendar } from 'lucide-react';

function SecretsList({ secrets, loading, onDelete, onViewDetails, onRefresh }) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (secrets.length === 0) {
    return (
      <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-12 text-center">
        <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No secrets found</h3>
        <p className="text-gray-400">Create your first secret to get started</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/50 border-b border-gray-600">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {secrets.map((secret) => (
              <tr key={secret.ID} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{secret.Name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-400 font-mono text-sm">
                    {secret.ID.substring(0, 12)}...
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                    {secret.Driver}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    {formatDate(secret.CreatedAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewDetails(secret)}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </button>
                    <button
                      onClick={() => onDelete(secret.ID)}
                      className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete secret"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 bg-gray-700/30 border-t border-gray-700 flex justify-between items-center">
        <p className="text-gray-400 text-sm">
          Showing {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

export default SecretsList;
