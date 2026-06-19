import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.uploadAudits.v1';

function loadLocalUploadAudits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalUploadAudits(audits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortUploadAudits(audits)));
}

function sortUploadAudits(audits) {
  return [...audits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function toUploadAudit(row) {
  return {
    id: row.id,
    userEmail: row.user_email || '',
    fileName: row.file_name || '',
    summary: row.summary || {},
    totalOpenValue: row.total_open_value || 0,
    totalClosedValue: row.total_closed_value || 0,
    createdAt: row.created_at,
  };
}

function toRow(audit) {
  const row = {};

  if ('id' in audit) row.id = audit.id;
  if ('userEmail' in audit) row.user_email = audit.userEmail || null;
  if ('fileName' in audit) row.file_name = audit.fileName || null;
  if ('summary' in audit) row.summary = audit.summary || {};
  if ('totalOpenValue' in audit) row.total_open_value = Number(audit.totalOpenValue || 0);
  if ('totalClosedValue' in audit) row.total_closed_value = Number(audit.totalClosedValue || 0);
  if ('createdAt' in audit) row.created_at = audit.createdAt;

  return row;
}

export async function loadUploadAudits() {
  if (!supabase) {
    return { audits: sortUploadAudits(loadLocalUploadAudits()), mode: 'local' };
  }

  const { data, error } = await supabase
    .from('upload_audits')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return { audits: sortUploadAudits(loadLocalUploadAudits()), mode: 'local' };
    throw error;
  }

  const audits = data.map(toUploadAudit);
  saveLocalUploadAudits(audits);
  return { audits, mode: 'supabase' };
}

export async function createUploadAudit(audit) {
  if (!supabase) {
    const audits = sortUploadAudits([audit, ...loadLocalUploadAudits()]);
    saveLocalUploadAudits(audits);
    return audit;
  }

  const { data, error } = await supabase.from('upload_audits').insert(toRow(audit)).select('*').single();
  if (error) {
    if (error.code === '42P01') {
      const audits = sortUploadAudits([audit, ...loadLocalUploadAudits()]);
      saveLocalUploadAudits(audits);
      return audit;
    }
    throw error;
  }

  const savedAudit = toUploadAudit(data);
  saveLocalUploadAudits([
    savedAudit,
    ...loadLocalUploadAudits().filter((item) => item.id !== savedAudit.id),
  ]);
  return savedAudit;
}
