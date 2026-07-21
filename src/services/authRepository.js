import { supabase } from './supabaseClient';

async function syncRealtimeAuth(session) {
  if (!supabase) return;
  try {
    await supabase.realtime.setAuth(session?.access_token || null);
  } catch {
    // Realtime auth is retried on the next auth/session update.
  }
}

export async function getCurrentSession() {
  if (!supabase) return { user: null, session: null };

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  await syncRealtimeAuth(session);
  return { session, user: session?.user || null };
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    await syncRealtimeAuth(session);
    callback({ session, user: session?.user || null });
  });

  return () => subscription.unsubscribe();
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase nao configurado.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  await syncRealtimeAuth(data.session);
  return { session: data.session, user: data.user };
}

export async function signOut() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await syncRealtimeAuth(null);
}
