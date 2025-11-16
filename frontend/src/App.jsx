import { useState, useEffect } from 'react';
import { secretsApi } from './api';
import SecretsList from './components/SecretsList';
import CreateSecretModal from './components/CreateSecretModal';
import BulkCreateSecretModal from './components/BulkCreateSecretModal';
import SecretDetailsModal from './components/SecretDetailsModal';
import Header from './components/Header';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Plus, AlertCircle, Loader, Upload } from 'lucide-react';
import ChangePasswordModal from './components/ChangePasswordModal';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState(null);
  const [podmanStatus, setPodmanStatus] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecrets();
      checkPodmanHealth();
    }
  }, [user]);

  const checkPodmanHealth = async () => {
    try {
      const health = await secretsApi.healthCheck();
      setPodmanStatus(health);
    } catch (err) {
      console.error('Health check failed:', err);
      setPodmanStatus({ podman_available: false, error: 'Connection failed' });
    }
  };

  const loadSecrets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await secretsApi.listSecrets();
      setSecrets(data);
    } catch (err) {
      console.error('Error loading secrets:', err);
      setError(err.response?.data?.detail || 'Failed to load secrets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecret = async (name, data) => {
    try {
      await secretsApi.createSecret(name, data);
      setShowCreateModal(false);
      loadSecrets();
    } catch (err) {
      throw new Error(err.response?.data?.detail || 'Failed to create secret');
    }
  };

  const handleBulkCreateSecrets = async (secrets) => {
    const result = await secretsApi.createBulkSecrets(secrets);
    loadSecrets();
    return result;
  };

  const handleDeleteSecret = async (secretId) => {
    if (!window.confirm('Are you sure you want to delete this secret?')) {
      return;
    }
    
    try {
      await secretsApi.deleteSecret(secretId);
      loadSecrets();
      if (selectedSecret?.ID === secretId) {
        setSelectedSecret(null);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete secret');
    }
  };

  const handleViewDetails = async (secret) => {
    try {
      const details = await secretsApi.inspectSecret(secret.ID);
      setSelectedSecret(details);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load secret details');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header podmanStatus={podmanStatus} onOpenChangePassword={() => setShowChangePassword(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        {podmanStatus && !podmanStatus.podman_available && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium">Podman is not available</p>
              <p className="text-red-300 text-sm">{podmanStatus.error}</p>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Secrets</h2>
            <p className="text-gray-400 mt-1">
              {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'} total
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkCreateModal(true)}
              disabled={podmanStatus && !podmanStatus.podman_available}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Upload className="w-5 h-5" />
              Bulk Create
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={podmanStatus && !podmanStatus.podman_available}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Secret
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Secrets List */}
        <SecretsList
          secrets={secrets}
          loading={loading}
          onDelete={handleDeleteSecret}
          onViewDetails={handleViewDetails}
          onRefresh={loadSecrets}
        />
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateSecretModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSecret}
        />
      )}

      {showBulkCreateModal && (
        <BulkCreateSecretModal
          onClose={() => setShowBulkCreateModal(false)}
          onCreate={handleBulkCreateSecrets}
        />
      )}

      {selectedSecret && (
        <SecretDetailsModal
          secret={selectedSecret}
          onClose={() => setSelectedSecret(null)}
          onDelete={handleDeleteSecret}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
