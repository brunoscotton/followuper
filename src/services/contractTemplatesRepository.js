import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.contractTemplates.v1';

function loadLocalTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

function toTemplate(row) {
  return {
    type: row.template_type,
    fileName: row.file_name || '',
    fileData: row.file_data || '',
    mimeType: row.mime_type || 'application/pdf',
    updatedAt: row.updated_at,
  };
}

function toRow(template) {
  return {
    template_type: template.type,
    file_name: template.fileName || '',
    file_data: template.fileData || '',
    mime_type: template.mimeType || 'application/pdf',
    updated_at: template.updatedAt || new Date().toISOString(),
  };
}

export function cacheContractTemplates(templates) {
  saveLocalTemplates(templates);
}

export async function loadContractTemplates() {
  if (!supabase) {
    return { templates: loadLocalTemplates(), mode: 'local' };
  }

  const { data, error } = await supabase.from('contract_templates').select('*').order('template_type', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return { templates: loadLocalTemplates(), mode: 'local' };
    throw error;
  }

  const templates = data.map(toTemplate);
  saveLocalTemplates(templates);
  return { templates, mode: 'supabase' };
}

export async function upsertContractTemplate(template) {
  const nextTemplate = { ...template, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const templates = [
      nextTemplate,
      ...loadLocalTemplates().filter((item) => item.type !== nextTemplate.type),
    ];
    saveLocalTemplates(templates);
    return nextTemplate;
  }

  const { data, error } = await supabase
    .from('contract_templates')
    .upsert(toRow(nextTemplate), { onConflict: 'template_type' })
    .select('*')
    .single();

  if (error) throw error;

  const savedTemplate = toTemplate(data);
  saveLocalTemplates([
    savedTemplate,
    ...loadLocalTemplates().filter((item) => item.type !== savedTemplate.type),
  ]);
  return savedTemplate;
}

export function subscribeToContractTemplateChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:contract_templates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_templates' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        template: payload.new?.template_type ? toTemplate(payload.new) : null,
        oldId: payload.old?.template_type,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
