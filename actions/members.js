'use server';

// members.js: Server actions for creating, updating, and managing choir member records

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { SECTIONS } from '@/lib/config';

/**
 * Fetches all members with optional filtering by section and active status.
 * Ordered by section ASC, name ASC.
 * @param {Object} options - Optional filters
 * @param {string} [options.section] - Filter by voice section
 * @param {boolean} [options.isActive] - Filter by active status
 * @returns {{ data: Array|null, error: string|null }}
 */
export async function getMembers({ section, isActive } = {}) {
  try {
    const supabase = await createClient();
    let query = supabase.from('members').select('*');

    if (section) {
      query = query.eq('section', section);
    }
    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive);
    }

    query = query.order('section', { ascending: true }).order('name', { ascending: true });

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Fetches a single member by their ID.
 * @param {string} memberId - UUID of the member
 * @returns {{ data: Object|null, error: string|null }}
 */
export async function getMemberById(memberId) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Creates a new choir member record.
 * Validates that name is provided and section is a valid voice part.
 * @param {Object} params
 * @param {string} params.name - Member's full name (required)
 * @param {string} params.section - Voice section: Soprano, Alto, Tenor, or Bass (required)
 * @param {string} [params.photoUrl] - URL to member's photo
 * @returns {{ data: Object|null, error: string|null }}
 */
export async function createMember({ name, section, photoUrl }) {
  try {
    if (!name || !name.trim()) return { data: null, error: 'Name is required' };
    if (!section || !SECTIONS.includes(section)) {
      return { data: null, error: `Section must be one of: ${SECTIONS.join(', ')}` };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('members')
      .insert({
        name: name.trim(),
        section,
        photo_url: photoUrl || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/members');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Updates an existing member's information.
 * Validates section if provided. Only updates fields that are passed.
 * @param {string} memberId - UUID of the member to update
 * @param {Object} updates
 * @param {string} [updates.name] - Updated name
 * @param {string} [updates.section] - Updated section
 * @param {string} [updates.photoUrl] - Updated photo URL
 * @param {boolean} [updates.isActive] - Updated active status
 * @returns {{ data: Object|null, error: string|null }}
 */
export async function updateMember(memberId, { name, section, photoUrl, isActive }) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };
    if (section && !SECTIONS.includes(section)) {
      return { data: null, error: `Section must be one of: ${SECTIONS.join(', ')}` };
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (section !== undefined) updates.section = section;
    if (photoUrl !== undefined) updates.photo_url = photoUrl;
    if (typeof isActive === 'boolean') updates.is_active = isActive;

    if (Object.keys(updates).length === 0) {
      return { data: null, error: 'No fields to update' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/members');
    revalidatePath(`/members/${memberId}`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Uploads a member's photo to Supabase Storage and updates their profile.
 * Stores file at: member-photos/{memberId}/{timestamp}.{extension}
 * @param {string} memberId - UUID of the member
 * @param {File} file - Image file to upload
 * @returns {{ data: { publicUrl: string }|null, error: string|null }}
 */
export async function uploadMemberPhoto(memberId, file) {
  try {
    if (!memberId) return { data: null, error: 'Member ID is required' };
    if (!file) return { data: null, error: 'File is required' };

    const supabase = await createClient();

    // Extract file extension from the file name
    const ext = file.name?.split('.').pop() || 'jpg';
    const filePath = `${memberId}/${Date.now()}.${ext}`;

    // Upload to the member-photos bucket
    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) return { data: null, error: uploadError.message };

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('member-photos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update the member record with the new photo URL
    const { error: updateError } = await supabase
      .from('members')
      .update({ photo_url: publicUrl })
      .eq('id', memberId);

    if (updateError) return { data: null, error: updateError.message };

    revalidatePath('/members');
    revalidatePath(`/members/${memberId}`);
    return { data: { publicUrl }, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Deletes a member record by ID.
 * @param {string} memberId - UUID of the member to delete
 * @returns {{ success: boolean, error: string|null }}
 */
export async function deleteMember(memberId) {
  try {
    if (!memberId) return { success: false, error: 'Member ID is required' };

    const supabase = await createClient();
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/members');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
