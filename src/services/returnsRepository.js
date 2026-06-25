import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.returnEntries.v1';

function loadLocalReturnEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalReturnEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortReturnEntries(entries)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortReturnEntries(entries) {
  return [...entries].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

export function cacheReturnEntries(entries) {
  saveLocalReturnEntries(entries);
}

function toReturnEntry(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number || '',
    returnType: row.return_type || 'Total',
    items: Array.isArray(row.items) ? row.items : [],
    status: row.status || 'Aguardando retorno cliente',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};
  if ('id' in entry) row.id = entry.id;
  if ('invoiceNumber' in entry) row.invoice_number = entry.invoiceNumber || '';
  if ('returnType' in entry) row.return_type = entry.returnType || 'Total';
  if ('items' in entry) row.items = entry.items || [];
  if ('status' in entry) row.status = entry.status || 'Aguardando retorno cliente';
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;
  return row;
}

export async function loadReturnEntries() {
  if (!supabase) {
    return { entries: sortReturnEntries(loadLocalReturnEntries()), mode: 'local' };
  }

  const { data, error } = await supabase.from('return_entries').select('*').order('updated_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      return { entries: sortReturnEntries(loadLocalReturnEntries()), mode: 'local' };
    }
    throw error;
  }

  const entries = sortReturnEntries(data.map(toReturnEntry));
  saveLocalReturnEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function createReturnEntry(entry) {
  if (!supabase) {
    const entries = sortReturnEntries([entry, ...loadLocalReturnEntries()]);
    saveLocalReturnEntries(entries);
    return entry;
  }

  const { data, error } = await supabase.from('return_entries').insert(toRow(entry)).select('*').single();
  if (error) throw error;

  const savedEntry = toReturnEntry(data);
  saveLocalReturnEntries(sortReturnEntries([savedEntry, ...loadLocalReturnEntries().filter((item) => item.id !== savedEntry.id)]));
  return savedEntry;
}

export async function updateReturnEntry(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const entries = loadLocalReturnEntries().map((entry) => (entry.id === id ? { ...entry, ...nextChanges } : entry));
    saveLocalReturnEntries(entries);
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase.from('return_entries').update(toRow(nextChanges)).eq('id', id).select('*').single();
  if (error) throw error;

  const savedEntry = toReturnEntry(data);
  saveLocalReturnEntries(sortReturnEntries(loadLocalReturnEntries().map((entry) => (entry.id === id ? savedEntry : entry))));
  return savedEntry;
}

export async function deleteReturnEntry(id) {
  if (!supabase) {
    saveLocalReturnEntries(loadLocalReturnEntries().filter((entry) => entry.id !== id));
    return;
  }

  const { error } = await supabase.from('return_entries').delete().eq('id', id);
  if (error) throw error;

  saveLocalReturnEntries(loadLocalReturnEntries().filter((entry) => entry.id !== id));
}

export function subscribeToReturnChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:return_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'return_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toReturnEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
