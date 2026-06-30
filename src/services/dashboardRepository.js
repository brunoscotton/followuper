import { supabase } from './supabaseClient';

const SETTINGS_STORAGE_KEY = 'followuper.dashboardSettings.v1';
const SNAPSHOTS_STORAGE_KEY = 'followuper.dashboardSnapshots.v1';

function loadLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

function toSetting(row) {
  return {
    periodKey: row?.period_key || 'current',
    updatedBy: row?.updated_by || '',
    updatedAt: row?.updated_at || '',
  };
}

function toSnapshot(row) {
  return {
    periodKey: row.period_key,
    quotes: Array.isArray(row.quotes_data) ? row.quotes_data : [],
    capturedBy: row.captured_by || '',
    capturedAt: row.captured_at,
  };
}

export async function loadDashboardControl() {
  if (!supabase) {
    const snapshots = loadLocal(SNAPSHOTS_STORAGE_KEY, []);
    return {
      setting: loadLocal(SETTINGS_STORAGE_KEY, { periodKey: 'current' }),
      snapshots: snapshots.map(({ periodKey, capturedAt }) => ({ periodKey, capturedAt })),
      mode: 'local',
    };
  }

  const [settingResult, snapshotsResult] = await Promise.all([
    supabase.from('dashboard_settings').select('*').eq('id', 'current').maybeSingle(),
    supabase
      .from('dashboard_monthly_snapshots')
      .select('period_key,captured_at')
      .order('period_key', { ascending: false }),
  ]);
  const firstError = settingResult.error || snapshotsResult.error;
  if (firstError) {
    if (isMissingTableError(firstError)) {
      return {
        setting: loadLocal(SETTINGS_STORAGE_KEY, { periodKey: 'current' }),
        snapshots: loadLocal(SNAPSHOTS_STORAGE_KEY, []).map(({ periodKey, capturedAt }) => ({ periodKey, capturedAt })),
        mode: 'local',
      };
    }
    throw firstError;
  }

  const setting = toSetting(settingResult.data);
  const snapshots = snapshotsResult.data.map((row) => ({
    periodKey: row.period_key,
    capturedAt: row.captured_at,
  }));
  saveLocal(SETTINGS_STORAGE_KEY, setting);
  return { setting, snapshots, mode: 'supabase' };
}

export async function loadDashboardSnapshot(periodKey) {
  if (!periodKey || periodKey === 'current' || periodKey === 'general') return null;
  if (!supabase) {
    return loadLocal(SNAPSHOTS_STORAGE_KEY, []).find((snapshot) => snapshot.periodKey === periodKey) || null;
  }

  const { data, error } = await supabase
    .from('dashboard_monthly_snapshots')
    .select('*')
    .eq('period_key', periodKey)
    .maybeSingle();
  if (error) throw error;
  return data ? toSnapshot(data) : null;
}

export async function saveDashboardSnapshot(periodKey, quotes, capturedBy) {
  const snapshot = {
    periodKey,
    quotes,
    capturedBy: capturedBy || '',
    capturedAt: new Date().toISOString(),
  };

  if (!supabase) {
    const snapshots = loadLocal(SNAPSHOTS_STORAGE_KEY, []);
    saveLocal(SNAPSHOTS_STORAGE_KEY, [
      snapshot,
      ...snapshots.filter((item) => item.periodKey !== periodKey),
    ]);
    return snapshot;
  }

  const { data, error } = await supabase
    .from('dashboard_monthly_snapshots')
    .upsert(
      {
        period_key: periodKey,
        quotes_data: quotes,
        captured_by: snapshot.capturedBy,
        captured_at: snapshot.capturedAt,
      },
      { onConflict: 'period_key' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return toSnapshot(data);
}

export async function updateDashboardPeriod(periodKey, updatedBy) {
  const setting = {
    periodKey,
    updatedBy: updatedBy || '',
    updatedAt: new Date().toISOString(),
  };
  if (!supabase) {
    saveLocal(SETTINGS_STORAGE_KEY, setting);
    return setting;
  }

  const { data, error } = await supabase
    .from('dashboard_settings')
    .upsert(
      {
        id: 'current',
        period_key: periodKey,
        updated_by: setting.updatedBy,
        updated_at: setting.updatedAt,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return toSetting(data);
}

export function subscribeToDashboardSetting(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:dashboard_settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_settings' }, (payload) => {
      if (payload.new?.id) onChange(toSetting(payload.new));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
