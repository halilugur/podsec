import { Shield, Activity, LogOut, Key, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header({ podmanStatus, onOpenChangePassword }) {
  const { user, logout } = useAuth();
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PodSec</h1>
              <p className="text-gray-400 text-sm">Podman Secrets Manager</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {podmanStatus && (
              <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-lg">
                <Activity className={`w-4 h-4 ${podmanStatus.podman_available ? 'text-green-400' : 'text-red-400'}`} />
                <div className="text-sm">
                  <div>
                    <span className="text-gray-400">Podman:</span>
                    <span className={`ml-2 font-medium ${podmanStatus.podman_available ? 'text-green-400' : 'text-red-400'}`}>
                      {podmanStatus.podman_available ? `v${podmanStatus.version}` : 'Unavailable'}
                    </span>
                  </div>
                  {podmanStatus.podman_available && (podmanStatus.host !== 'default' || podmanStatus.connection !== 'default') && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {podmanStatus.host !== 'default' ? `Host: ${podmanStatus.host}` : `Connection: ${podmanStatus.connection}`}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-lg">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{user.username}</span>
                </div>
                
                <button
                  onClick={onOpenChangePassword}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-colors"
                  title="Change Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                
                <button
                  onClick={logout}
                  className="p-2 bg-gray-700/50 hover:bg-red-600/50 text-gray-300 hover:text-red-300 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
    </header>
  );
}

export default Header;
