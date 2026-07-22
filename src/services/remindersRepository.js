import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.reminders.v1';

function loadLocalReminders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalReminders(reminders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortReminders(reminders)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortReminders(reminders) {
  return [...reminders].sort((a, b) => {
    const aArchived = Boolean(a.archivedAt);
    const bArchived = Boolean(b.archivedAt);
    if (aArchived !== bArchived) return aArchived ? 1 : -1;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });
}

export function cacheReminders(reminders) {
  saveLocalReminders(reminders);
}

function toReminder(row) {
  return {
    id: row.id,
    message: row.message || '',
    targetType: row.target_type || 'user',
    targetUserId: row.target_user_id || '',
    targetEmail: row.target_email || '',
    targetName: row.target_name || '',
    createdById: row.created_by_id || '',
    createdByEmail: row.created_by_email || '',
    scheduleType: row.schedule_type || 'immediate',
    intervalAmount: row.interval_amount || 1,
    intervalUnit: row.interval_unit || 'minutes',
    nextDueAt: row.next_due_at || '',
    snoozedUntil: row.snoozed_until || '',
    archivedAt: row.archived_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(reminder) {
  const row = {};
  if ('id' in reminder) row.id = reminder.id;
  if ('message' in reminder) row.message = reminder.message || '';
  if ('targetType' in reminder) row.target_type = reminder.targetType || 'user';
  if ('targetUserId' in reminder) row.target_user_id = reminder.targetUserId || null;
  if ('targetEmail' in reminder) row.target_email = reminder.targetEmail || '';
  if ('targetName' in reminder) row.target_name = reminder.targetName || '';
  if ('createdById' in reminder) row.created_by_id = reminder.createdById || null;
  if ('createdByEmail' in reminder) row.created_by_email = reminder.createdByEmail || '';
  if ('scheduleType' in reminder) row.schedule_type = reminder.scheduleType || 'immediate';
  if ('intervalAmount' in reminder) row.interval_amount = Number(reminder.intervalAmount || 1);
  if ('intervalUnit' in reminder) row.interval_unit = reminder.intervalUnit || 'minutes';
  if ('nextDueAt' in reminder) row.next_due_at = reminder.nextDueAt || null;
  if ('snoozedUntil' in reminder) row.snoozed_until = reminder.snoozedUntil || null;
  if ('archivedAt' in reminder) row.archived_at = reminder.archivedAt || null;
  if ('createdAt' in reminder) row.created_at = reminder.createdAt;
  if ('updatedAt' in reminder) row.updated_at = reminder.updatedAt;
  return row;
}

export async function loadReminders() {
  if (!supabase) {
    return { mode: 'local', reminders: sortReminders(loadLocalReminders()) };
  }

  const { data, error } = await supabase.from('reminders').select('*').order('updated_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      return { mode: 'local', reminders: sortReminders(loadLocalReminders()) };
    }
    throw error;
  }

  const reminders = sortReminders(data.map(toReminder));
  saveLocalReminders(reminders);
  return { mode: 'supabase', reminders };
}

export async function createReminder(reminder) {
  if (!supabase) {
    const reminders = sortReminders([reminder, ...loadLocalReminders()]);
    saveLocalReminders(reminders);
    return reminder;
  }

  const { data, error } = await supabase.from('reminders').insert(toRow(reminder)).select('*').single();
  if (error) throw error;

  const savedReminder = toReminder(data);
  saveLocalReminders(sortReminders([savedReminder, ...loadLocalReminders().filter((item) => item.id !== savedReminder.id)]));
  return savedReminder;
}

export async function updateReminder(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const reminders = loadLocalReminders().map((reminder) => (reminder.id === id ? { ...reminder, ...nextChanges } : reminder));
    saveLocalReminders(reminders);
    return reminders.find((reminder) => reminder.id === id);
  }

  const { data, error } = await supabase.from('reminders').update(toRow(nextChanges)).eq('id', id).select('*').single();
  if (error) throw error;

  const savedReminder = toReminder(data);
  saveLocalReminders(sortReminders(loadLocalReminders().map((reminder) => (reminder.id === id ? savedReminder : reminder))));
  return savedReminder;
}

export async function deleteReminder(id) {
  if (!supabase) {
    saveLocalReminders(loadLocalReminders().filter((reminder) => reminder.id !== id));
    return;
  }

  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw error;

  saveLocalReminders(loadLocalReminders().filter((reminder) => reminder.id !== id));
}

export function subscribeToReminderChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:reminders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        oldId: payload.old?.id,
        reminder: payload.new?.id ? toReminder(payload.new) : null,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
