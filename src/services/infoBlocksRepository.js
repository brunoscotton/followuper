import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.infoBlocks.v1';

function loadLocalBlocks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalBlocks(blocks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortInfoBlocks(blocks)));
}

export function cacheInfoBlocks(blocks) {
  saveLocalBlocks(blocks);
}

export function sortInfoBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    if ((a.position || 0) !== (b.position || 0)) return (a.position || 0) - (b.position || 0);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function toInfoBlock(row) {
  return {
    id: row.id,
    type: row.block_type || 'text',
    content: row.content || '',
    position: row.position || 0,
    isOpen: row.is_open !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(block) {
  const row = {};

  if ('id' in block) row.id = block.id;
  if ('type' in block) row.block_type = block.type;
  if ('content' in block) row.content = block.content || '';
  if ('position' in block) row.position = block.position || 0;
  if ('isOpen' in block) row.is_open = block.isOpen !== false;
  if ('createdAt' in block) row.created_at = block.createdAt;
  if ('updatedAt' in block) row.updated_at = block.updatedAt;

  return row;
}

export async function loadInfoBlocks() {
  if (!supabase) {
    return { blocks: sortInfoBlocks(loadLocalBlocks()), mode: 'local' };
  }

  const { data, error } = await supabase.from('info_blocks').select('*').order('position', { ascending: true });
  if (error) throw error;

  const blocks = sortInfoBlocks(data.map(toInfoBlock));
  saveLocalBlocks(blocks);
  return { blocks, mode: 'supabase' };
}

export async function createInfoBlock(block) {
  if (!supabase) {
    const blocks = sortInfoBlocks([...loadLocalBlocks(), block]);
    saveLocalBlocks(blocks);
    return block;
  }

  const { data, error } = await supabase.from('info_blocks').insert(toRow(block)).select('*').single();
  if (error) throw error;

  const savedBlock = toInfoBlock(data);
  saveLocalBlocks(sortInfoBlocks([...loadLocalBlocks().filter((item) => item.id !== savedBlock.id), savedBlock]));
  return savedBlock;
}

export async function updateInfoBlock(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const blocks = loadLocalBlocks().map((block) => (block.id === id ? { ...block, ...nextChanges } : block));
    saveLocalBlocks(sortInfoBlocks(blocks));
    return blocks.find((block) => block.id === id);
  }

  const { data, error } = await supabase.from('info_blocks').update(toRow(nextChanges)).eq('id', id).select('*').single();
  if (error) throw error;

  const savedBlock = toInfoBlock(data);
  const blocks = loadLocalBlocks().map((block) => (block.id === id ? savedBlock : block));
  saveLocalBlocks(sortInfoBlocks(blocks));
  return savedBlock;
}

export async function deleteInfoBlock(id) {
  if (!supabase) {
    saveLocalBlocks(loadLocalBlocks().filter((block) => block.id !== id));
    return;
  }

  const { error } = await supabase.from('info_blocks').delete().eq('id', id);
  if (error) throw error;

  saveLocalBlocks(loadLocalBlocks().filter((block) => block.id !== id));
}

export function subscribeToInfoBlockChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:info_blocks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'info_blocks' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        block: payload.new?.id ? toInfoBlock(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
