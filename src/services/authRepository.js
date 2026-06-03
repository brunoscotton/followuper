import { supabase } from './supabaseClient';

export async function getCurrentSession() {
  if (!supabase) return { user: null, session: null };

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return { session, user: session?.user || null };
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({ session, user: session?.user || null });
  });

  return () => subscription.unsubscribe();
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase nao configurado.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return { session: data.session, user: data.user };
}

export async function signOut() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
