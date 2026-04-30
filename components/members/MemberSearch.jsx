'use client';

// MemberSearch.jsx: Search bar for the members list

import { useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Renders a search input.
 * Calls onFilter({ search, section }) whenever values change.
 * Section filter state is preserved, but UI is removed (moved to stats card in page.jsx)
 */
export default function MemberSearch({ onFilter }) {
  const [search, setSearch] = useState('');
  
  // Note: we still accept section as it might be passed down or handled by parent state
  // But this component now only handles the search input itself.

  const handleSearch = (val) => {
    setSearch(val);
    onFilter(prev => ({ ...prev, search: val }));
  };

  return (
    <div className="flex items-center gap-3 mb-6 relative w-full max-w-md">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        <Search size={18} />
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search members..."
        className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all placeholder:text-gray-400"
      />
    </div>
  );
}
