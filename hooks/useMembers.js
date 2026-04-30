'use client';

// useMembers.js: Custom hook for fetching and managing the members list

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetches all members with optional filtering by section and active status.
 * Ordered by section ASC, name ASC.
 * @param {Object} options
 * @param {string} [options.section] - Filter by voice section
 * @param {boolean} [options.isActive] - Filter by active status
 * @returns {{ members: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export default function useMembers({ section, isActive } = {}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase.from('members').select('*');

      if (section) {
        query = query.eq('section', section);
      }
      if (typeof isActive === 'boolean') {
        query = query.eq('is_active', isActive);
      }

      query = query
        .order('section', { ascending: true })
        .order('name', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setMembers([]);
      } else {
        setMembers(data || []);
      }
    } catch (err) {
      setError(err.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [section, isActive]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
}
