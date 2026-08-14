import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.regularizationEntries.v1';
const CORRUPTED_ACCUMULATED_VALUE_THRESHOLD = 100000000;
const CENTS_SHIFT_REPAIR_MIN_VALUE = 1000;
const CENTS_SHIFT_FACTOR = 100;
const CENTS_SHIFT_TOLERANCE = 0.01;

function loadLocalEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortRegularizationEntries(entries)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortRegularizationEntries(entries) {
  return [...entries].sort((a, b) => (a.clientName || '').localeCompare(b.clientName || '', 'pt-BR'));
}

export function cacheRegularizationEntries(entries) {
  saveLocalEntries(entries);
}

function toRegularizationEntry(row) {
  return {
    id: row.id,
    rowKey: row.row_key || '',
    clientCode: row.client_code || '',
    storeCode: row.store_code || '',
    clientName: row.client_name || '',
    accumulatedValue: Number(row.accumulated_value || 0),
    phone: row.phone || '',
    mobile: row.mobile || '',
    invoiceEmail: row.invoice_email || '',
    contractEmail: row.contract_email || '',
    commercialEmail: row.commercial_email || '',
    seller: row.seller || '',
    status: row.status || 'priority_not_sent',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};
  if ('id' in entry) row.id = entry.id;
  if ('rowKey' in entry) row.row_key = entry.rowKey || '';
  if ('clientCode' in entry) row.client_code = entry.clientCode || '';
  if ('storeCode' in entry) row.store_code = entry.storeCode || '';
  if ('clientName' in entry) row.client_name = entry.clientName || '';
  if ('accumulatedValue' in entry) row.accumulated_value = Number(entry.accumulatedValue || 0);
  if ('phone' in entry) row.phone = entry.phone || '';
  if ('mobile' in entry) row.mobile = entry.mobile || '';
  if ('invoiceEmail' in entry) row.invoice_email = entry.invoiceEmail || '';
  if ('contractEmail' in entry) row.contract_email = entry.contractEmail || '';
  if ('commercialEmail' in entry) row.commercial_email = entry.commercialEmail || '';
  if ('seller' in entry) row.seller = entry.seller || '';
  if ('status' in entry) row.status = entry.status || 'priority_not_sent';
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;
  return row;
}

function shouldRepairAccumulatedValue(existingEntry, uploadEntry) {
  const existingValue = Number(existingEntry?.accumulatedValue || 0);
  const uploadValue = Number(uploadEntry?.accumulatedValue || 0);
  const isLegacyCorruptedValue = existingValue >= CORRUPTED_ACCUMULATED_VALUE_THRESHOLD;
  const isCentsShiftedValue =
    existingValue >= CENTS_SHIFT_REPAIR_MIN_VALUE &&
    uploadValue > 0 &&
    Math.abs(existingValue - uploadValue * CENTS_SHIFT_FACTOR) <= CENTS_SHIFT_TOLERANCE;

  return (
    Number.isFinite(existingValue) &&
    Number.isFinite(uploadValue) &&
    (isLegacyCorruptedValue || isCentsShiftedValue) &&
    uploadValue >= 0 &&
    uploadValue < CORRUPTED_ACCUMULATED_VALUE_THRESHOLD
  );
}

function mergeLocalRegularizationEntries(existingEntries, uploadRows, now) {
  const existingByKey = new Map(existingEntries.map((entry) => [entry.rowKey, entry]));
  const uploadByKey = new Map(uploadRows.map((entry) => [entry.rowKey, entry]));
  const newEntries = uploadRows
    .filter((entry) => !existingByKey.has(entry.rowKey))
    .map((entry) => ({ ...entry, createdAt: now, updatedAt: now }));
  const repairedEntries = existingEntries.map((entry) => {
    const uploadEntry = uploadByKey.get(entry.rowKey);
    if (!shouldRepairAccumulatedValue(entry, uploadEntry)) return entry;
    return { ...entry, accumulatedValue: uploadEntry.accumulatedValue, updatedAt: now };
  });
  const repairedCount = repairedEntries.filter((entry, index) => entry !== existingEntries[index]).length;
  const entries = sortRegularizationEntries([...repairedEntries, ...newEntries]);
  saveLocalEntries(entries);

  return {
    entries,
    insertedCount: newEntries.length,
    repairedCount,
    skippedCount: uploadRows.length - newEntries.length,
  };
}

export async function loadRegularizationEntries() {
  if (!supabase) {
    return { entries: sortRegularizationEntries(loadLocalEntries()), mode: 'local' };
  }

  const { data, error } = await supabase
    .from('regularization_entries')
    .select('*')
    .order('client_name', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { entries: sortRegularizationEntries(loadLocalEntries()), mode: 'local' };
    }
    throw error;
  }

  const entries = sortRegularizationEntries((data || []).map(toRegularizationEntry));
  saveLocalEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function mergeRegularizationEntries(uploadRows) {
  const now = new Date().toISOString();

  if (!supabase) {
    return mergeLocalRegularizationEntries(loadLocalEntries(), uploadRows, now);
  }

  const { data: existingData, error: existingError } = await supabase.from('regularization_entries').select('*');
  if (existingError) {
    if (!isMissingTableError(existingError)) throw existingError;
    return mergeLocalRegularizationEntries(loadLocalEntries(), uploadRows, now);
  }

  const existingEntries = (existingData || []).map(toRegularizationEntry);
  const existingByKey = new Map(existingEntries.map((entry) => [entry.rowKey, entry]));
  const newEntries = uploadRows
    .filter((entry) => !existingByKey.has(entry.rowKey))
    .map((entry) => ({ ...entry, createdAt: now, updatedAt: now }));
  const repairRows = uploadRows.filter((entry) =>
    shouldRepairAccumulatedValue(existingByKey.get(entry.rowKey), entry),
  );

  if (newEntries.length === 0 && repairRows.length === 0) {
    const entries = sortRegularizationEntries(existingEntries);
    saveLocalEntries(entries);
    return { entries, insertedCount: 0, repairedCount: 0, skippedCount: uploadRows.length };
  }

  const repairedEntries = [];
  for (const row of repairRows) {
    const existingEntry = existingByKey.get(row.rowKey);
    const { data, error } = await supabase
      .from('regularization_entries')
      .update(toRow({ accumulatedValue: row.accumulatedValue, updatedAt: now }))
      .eq('id', existingEntry.id)
      .select('*')
      .single();
    if (error) throw error;
    repairedEntries.push(toRegularizationEntry(data));
  }

  let savedEntries = [];
  if (newEntries.length > 0) {
    const { data, error } = await supabase
      .from('regularization_entries')
      .insert(newEntries.map(toRow))
      .select('*');
    if (error) throw error;
    savedEntries = (data || []).map(toRegularizationEntry);
  }

  const repairedById = new Map(repairedEntries.map((entry) => [entry.id, entry]));
  const entries = sortRegularizationEntries([
    ...existingEntries.map((entry) => repairedById.get(entry.id) || entry),
    ...savedEntries,
  ]);
  saveLocalEntries(entries);
  return {
    entries,
    insertedCount: savedEntries.length,
    repairedCount: repairedEntries.length,
    skippedCount: uploadRows.length - savedEntries.length,
  };
}

export async function updateRegularizationEntry(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const entries = loadLocalEntries().map((entry) => (entry.id === id ? { ...entry, ...nextChanges } : entry));
    saveLocalEntries(entries);
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase
    .from('regularization_entries')
    .update(toRow(nextChanges))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  const savedEntry = toRegularizationEntry(data);
  saveLocalEntries(sortRegularizationEntries(loadLocalEntries().map((entry) => (entry.id === id ? savedEntry : entry))));
  return savedEntry;
}

export async function deleteRegularizationEntry(id) {
  if (!supabase) {
    saveLocalEntries(loadLocalEntries().filter((entry) => entry.id !== id));
    return;
  }

  const { error } = await supabase.from('regularization_entries').delete().eq('id', id);
  if (error) throw error;

  saveLocalEntries(loadLocalEntries().filter((entry) => entry.id !== id));
}

export function subscribeToRegularizationChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:regularization_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'regularization_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toRegularizationEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
