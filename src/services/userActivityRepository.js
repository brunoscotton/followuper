import { supabase } from './supabaseClient';

export const MASTER_USER_EMAIL = 'bruno.scotton@cdsav.com.br';

function getDisplayName(user) {
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (metadataName) return metadataName;

  const emailName = String(user?.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  return emailName ? emailName.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Usuário';
}

function toUserProfile(row) {
  return {
    id: row.user_id,
    email: row.email || '',
    displayName: row.display_name || '',
    currentView: row.current_view || '',
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

function toActivityLog(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email || 'Sistema',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id || '',
    identifier: row.identifier || '',
    changedFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
    createdAt: row.created_at,
  };
}

export function userIsMaster(user) {
  return String(user?.email || '').trim().toLowerCase() === MASTER_USER_EMAIL;
}

export async function registerUserProfile(user, currentView = 'quotes') {
  if (!supabase || !user?.id) return;

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      email: user.email || '',
      display_name: getDisplayName(user),
      current_view: currentView,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error && error.code !== '42P01') throw error;
}

export async function loadUserActivity() {
  if (!supabase) return { profiles: [], logs: [] };

  const [profilesResult, logsResult] = await Promise.all([
    supabase.from('user_profiles').select('*').order('last_seen_at', { ascending: false }),
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (logsResult.error) throw logsResult.error;

  return {
    profiles: profilesResult.data.map(toUserProfile),
    logs: logsResult.data.map(toActivityLog),
  };
}

export function startUserPresence(user, initialState, onSync) {
  if (!supabase || !user?.id) return { update: () => {}, unsubscribe: () => {} };

  let currentState = initialState;
  const channel = supabase.channel('followuper:online-users', {
    config: {
      private: true,
      presence: { key: `${user.id}:${crypto.randomUUID()}` },
    },
  });

  const buildPayload = () => ({
    userId: user.id,
    email: user.email || '',
    displayName: getDisplayName(user),
    currentView: currentState.currentView,
    layoutMode: currentState.layoutMode,
    onlineAt: new Date().toISOString(),
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      onSync(Object.values(channel.presenceState()).flat().filter((presence) => presence?.userId));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track(buildPayload());
    });

  return {
    async update(nextState) {
      currentState = { ...currentState, ...nextState };
      await channel.track(buildPayload());
    },
    unsubscribe() {
      channel.untrack();
      supabase.removeChannel(channel);
    },
  };
}

export function subscribeToUserActivity(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:user-activity')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, (payload) => {
      onChange({
        collection: 'profiles',
        eventType: payload.eventType,
        item: payload.new?.user_id ? toUserProfile(payload.new) : null,
        oldId: payload.old?.user_id,
      });
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
      onChange({
        collection: 'logs',
        eventType: payload.eventType,
        item: payload.new?.id ? toActivityLog(payload.new) : null,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
