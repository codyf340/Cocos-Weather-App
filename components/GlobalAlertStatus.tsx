
import React from 'react';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface GlobalAlertStatusProps {
  status: 'idle' | 'checking' | 'success' | 'error';
  lastChecked: string | null;
}

const GlobalAlertStatus: React.FC<GlobalAlertStatusProps> = ({ status, lastChecked }) => {
  const getStatusContent = () => {
    switch (status) {
      case 'checking':
        return {
          bgColor: 'bg-slate-800/50',
          borderColor: 'border-slate-700',
          textColor: 'text-slate-300',
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          text: 'Actively checking all locations for updates...'
        };
      case 'success':
        return {
          bgColor: 'bg-emerald-900/50',
          borderColor: 'border-emerald-700/50',
          textColor: 'text-emerald-300',
          icon: <CheckCircle className="w-3 h-3" />,
          text: `All locations synced. Last check: ${lastChecked}`
        };
      case 'error':
        return {
          bgColor: 'bg-red-900/50',
          borderColor: 'border-red-700/50',
          textColor: 'text-red-300',
          icon: <AlertTriangle className="w-3 h-3" />,
          text: 'Failed to sync with weather service. Retrying soon.'
        };
      default: // idle
        return null;
    }
  };

  const content = getStatusContent();

  if (!content) return null;

  return (
    <div className={`border-b ${content.borderColor} ${content.bgColor} transition-all`}>
      <div className="max-w-6xl mx-auto px-4 py-1.5">
        <div className={`flex items-center justify-center gap-2 text-xs font-semibold ${content.textColor}`}>
          {content.icon}
          <span>{content.text}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalAlertStatus;
