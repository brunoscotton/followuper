import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.warrantyEntries.v1';

function loadLocalWarrantyEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalWarrantyEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortWarrantyEntries(entries)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortWarrantyEntries(entries) {
  return [...entries].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

export function cacheWarrantyEntries(entries) {
  saveLocalWarrantyEntries(entries);
}

function toWarrantyEntry(row) {
  return {
    id: row.id,
    warrantyNumber: row.warranty_number || '',
    motorSerialNumber: row.motor_serial_number || '',
    statuses: Array.isArray(row.statuses) ? row.statuses : [],
    notes: row.notes || '',
    attachmentFileName: row.attachment_file_name || '',
    attachmentFileData: row.attachment_file_data || '',
    attachmentMimeType: row.attachment_mime_type || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};
  if ('id' in entry) row.id = entry.id;
  if ('warrantyNumber' in entry) row.warranty_number = entry.warrantyNumber || '';
  if ('motorSerialNumber' in entry) row.motor_serial_number = entry.motorSerialNumber || '';
  if ('statuses' in entry) row.statuses = entry.statuses || [];
  if ('notes' in entry) row.notes = entry.notes || '';
  if ('attachmentFileName' in entry) row.attachment_file_name = entry.attachmentFileName || '';
  if ('attachmentFileData' in entry) row.attachment_file_data = entry.attachmentFileData || '';
  if ('attachmentMimeType' in entry) row.attachment_mime_type = entry.attachmentMimeType || '';
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;
  return row;
}

export async function loadWarrantyEntries() {
  if (!supabase) {
    return { entries: sortWarrantyEntries(loadLocalWarrantyEntries()), mode: 'local' };
  }

  const { data, error } = await supabase.from('warranty_entries').select('*').order('updated_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      return { entries: sortWarrantyEntries(loadLocalWarrantyEntries()), mode: 'local' };
    }
    throw error;
  }

  const entries = sortWarrantyEntries(data.map(toWarrantyEntry));
  saveLocalWarrantyEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function createWarrantyEntry(entry) {
  if (!supabase) {
    const entries = sortWarrantyEntries([entry, ...loadLocalWarrantyEntries()]);
    saveLocalWarrantyEntries(entries);
    return entry;
  }

  const { data, error } = await supabase.from('warranty_entries').insert(toRow(entry)).select('*').single();
  if (error) throw error;

  const savedEntry = toWarrantyEntry(data);
  saveLocalWarrantyEntries(sortWarrantyEntries([savedEntry, ...loadLocalWarrantyEntries().filter((item) => item.id !== savedEntry.id)]));
  return savedEntry;
}

export async function updateWarrantyEntry(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const entries = loadLocalWarrantyEntries().map((entry) => (entry.id === id ? { ...entry, ...nextChanges } : entry));
    saveLocalWarrantyEntries(entries);
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase.from('warranty_entries').update(toRow(nextChanges)).eq('id', id).select('*').single();
  if (error) throw error;

  const savedEntry = toWarrantyEntry(data);
  saveLocalWarrantyEntries(sortWarrantyEntries(loadLocalWarrantyEntries().map((entry) => (entry.id === id ? savedEntry : entry))));
  return savedEntry;
}

export async function deleteWarrantyEntry(id) {
  if (!supabase) {
    saveLocalWarrantyEntries(loadLocalWarrantyEntries().filter((entry) => entry.id !== id));
    return;
  }

  const { error } = await supabase.from('warranty_entries').delete().eq('id', id);
  if (error) throw error;

  saveLocalWarrantyEntries(loadLocalWarrantyEntries().filter((entry) => entry.id !== id));
}

export function subscribeToWarrantyChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:warranty_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'warranty_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toWarrantyEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
