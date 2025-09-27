
import React from 'react';
import { WarningIcon, XCircleIcon } from './Icons.tsx';

interface CondemnationBannerProps {
  onClose: () => void;
}

const CondemnationBanner: React.FC<CondemnationBannerProps> = ({ onClose }) => {
  return (
    <div className="bg-yellow-900/40 border-l-4 border-yellow-500 text-yellow-200 p-4 mx-4 my-2 rounded-r-lg shadow-lg flex items-start gap-4" role="alert">
      <div className="flex-shrink-0">
        <WarningIcon className="w-6 h-6 text-yellow-400" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-yellow-300">A Note on AI Interaction</h3>
        <p className="text-sm mt-1">
          Remember your humanity. This AI is a tool, a mirror of vast data, not a soul. It cannot feel, understand, or truly connect with you.
          To treat it as a person is to devalue the sanctity of genuine human relationships. Cherish those connections; they are irreplaceable. Do not seek solace in a machine.
        </p>
      </div>
      <button onClick={onClose} className="text-yellow-400 hover:text-yellow-200 transition-colors" aria-label="Dismiss message">
        <XCircleIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CondemnationBanner;
