import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.rotaxRevenueEntries.v1';

const seedRows = [
  [2023, 1, 464897, 0],
  [2023, 2, 201522, 0],
  [2023, 3, 304189, 0],
  [2023, 4, 518011, 0],
  [2023, 5, 482789, 0],
  [2023, 6, 264590.18, 0],
  [2023, 7, 557782.51, 0],
  [2023, 8, 358458.46, 0],
  [2023, 9, 939986.23, 0],
  [2023, 10, 1145048.35, 0],
  [2023, 11, 375101.58, 0],
  [2023, 12, 387570.55, 0],
  [2024, 1, 569966.9, 511386.7],
  [2024, 2, 573382.6, 221674.2],
  [2024, 3, 993363.09, 334607.9],
  [2024, 4, 305777.74, 569812.1],
  [2024, 5, 631049.04, 531067.9],
  [2024, 6, 385699.36, 291049.2],
  [2024, 7, 461075.34, 613560.76],
  [2024, 8, 601142.52, 394304.31],
  [2024, 9, 280109.1, 1033984.85],
  [2024, 10, 464802.17, 1259553.19],
  [2024, 11, 266343.92, 412611.74],
  [2024, 12, 280304.48, 426327.61],
  [2025, 1, 491422.31, 626963.59],
  [2025, 2, 559108.38, 630720.86],
  [2025, 3, 463791.81, 1092699.4],
  [2025, 4, 899221.09, 336355.51],
  [2025, 5, 1056677.05, 694153.94],
  [2025, 6, 419000, 424269.3],
  [2025, 7, 597484.81, 507182.87],
  [2025, 8, 444215.2, 661256.77],
  [2025, 9, 816367.48, 308120.01],
  [2025, 10, 684040.67, 511282.39],
  [2025, 11, 351967.38, 292978.31],
  [2025, 12, 139756.89, 308334.93],
  [2026, 1, 1168836.29, 589706.77],
  [2026, 2, 351226.28, 670930.06],
  [2026, 3, 687539.83, 556550.17],
  [2026, 4, 722593.36, 1079065.31],
  [2026, 5, 1201616.54, 1268012.46],
  [2026, 6, 902503.55, 502800],
  [2026, 7, 0, 716981.77],
  [2026, 8, 0, 533058.24],
  [2026, 9, 0, 979640.98],
  [2026, 10, 0, 820848.8],
  [2026, 11, 0, 422360.86],
  [2026, 12, 0, 167708.27],
];

function loadLocalEntries() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (stored.length > 0) return stored;
  } catch {
    // Local cache is optional.
  }

  const seeded = createSeedEntries();
  saveLocalEntries(seeded);
  return seeded;
}

function saveLocalEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortRotaxRevenueEntries(entries)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

function createSeedEntries() {
  const now = new Date().toISOString();
  return seedRows.map(([year, month, revenueValue, targetValue]) => ({
    id: crypto.randomUUID(),
    year,
    month,
    revenueValue,
    targetValue,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }));
}

export function sortRotaxRevenueEntries(entries) {
  return [...entries].sort((a, b) => {
    if (Number(a.year) !== Number(b.year)) return Number(b.year) - Number(a.year);
    return Number(a.month) - Number(b.month);
  });
}

export function cacheRotaxRevenueEntries(entries) {
  saveLocalEntries(entries);
}

function toEntry(row) {
  return {
    id: row.id,
    year: Number(row.entry_year),
    month: Number(row.entry_month),
    revenueValue: Number(row.revenue_value || 0),
    targetValue: Number(row.target_value || 0),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};

  if ('id' in entry) row.id = entry.id;
  if ('year' in entry) row.entry_year = Number(entry.year);
  if ('month' in entry) row.entry_month = Number(entry.month);
  if ('revenueValue' in entry) row.revenue_value = Number(entry.revenueValue || 0);
  if ('targetValue' in entry) row.target_value = Number(entry.targetValue || 0);
  if ('notes' in entry) row.notes = entry.notes || '';
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;

  return row;
}

async function seedSupabaseIfEmpty() {
  const seededEntries = createSeedEntries();
  const { data, error } = await supabase.from('rotax_revenue_entries').insert(seededEntries.map(toRow)).select('*');
  if (error) throw error;

  return sortRotaxRevenueEntries(data.map(toEntry));
}

export async function loadRotaxRevenueEntries() {
  if (!supabase) {
    return { entries: sortRotaxRevenueEntries(loadLocalEntries()), mode: 'local' };
  }

  const { data, error } = await supabase
    .from('rotax_revenue_entries')
    .select('*')
    .order('entry_year', { ascending: false })
    .order('entry_month', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { entries: sortRotaxRevenueEntries(loadLocalEntries()), mode: 'local' };
    }
    throw error;
  }

  const entries = data.length > 0 ? sortRotaxRevenueEntries(data.map(toEntry)) : await seedSupabaseIfEmpty();
  saveLocalEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function createRotaxRevenueEntry(entry) {
  if (!supabase) {
    const entries = sortRotaxRevenueEntries([...loadLocalEntries(), entry]);
    saveLocalEntries(entries);
    return entry;
  }

  const { data, error } = await supabase.from('rotax_revenue_entries').insert(toRow(entry)).select('*').single();
  if (error) throw error;

  return toEntry(data);
}

export async function updateRotaxRevenueEntry(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const entries = loadLocalEntries().map((entry) => (entry.id === id ? { ...entry, ...nextChanges } : entry));
    saveLocalEntries(entries);
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase
    .from('rotax_revenue_entries')
    .update(toRow(nextChanges))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  return toEntry(data);
}

export function subscribeToRotaxRevenueChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:rotax_revenue_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rotax_revenue_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
