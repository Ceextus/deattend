'use client';

// PunctualityBadge.jsx: Small colored badge showing punctuality status

import { getPunctualityColor } from '@/lib/utils';

/**
 * Renders a small colored badge with the punctuality status text.
 */
export default function PunctualityBadge({ status, delayMinutes }) {
  const colorClass = getPunctualityColor(status);

  const bgMap = {
    'text-green-600': 'bg-green-50',
    'text-amber-500': 'bg-amber-50',
    'text-red-500': 'bg-red-50',
    'text-gray-500': 'bg-gray-50',
  };

  return (
    <div className="text-right">
      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass} ${bgMap[colorClass] || 'bg-gray-50'}`}>
        {status}
      </span>
      {typeof delayMinutes === 'number' && delayMinutes > 0 && (
        <p className="text-[10px] text-gray-400 mt-0.5">+{delayMinutes} min</p>
      )}
    </div>
  );
}
