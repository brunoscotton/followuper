import { createClient } from '@supabase/supabase-js';

const CORREIOS_BASE_URL = process.env.CORREIOS_BASE_URL || 'https://api.correios.com.br';
const CORREIOS_RASTRO_ENDPOINT = process.env.CORREIOS_RASTRO_ENDPOINT || `${CORREIOS_BASE_URL}/srorastro/v1/objetos`;
const CORREIOS_TOKEN_ENDPOINT =
  process.env.CORREIOS_TOKEN_ENDPOINT || `${CORREIOS_BASE_URL}/token/v1/autentica/cartaopostagem`;

const deliveryMap = [
  { match: ['objeto entregue', 'entregue ao destinatario'], situation: 'Entregue' },
  { match: ['disponivel para retirada', 'aguardando retirada'], situation: 'Disponivel para Retirada' },
  { match: ['nao entregue', 'entrega nao efetuada'], situation: 'NAO ENTREGUE' },
  { match: ['manifestacao'], situation: 'Manifestacao' },
  { match: ['correcao de rota', 'correcao de endereco', 'endereco incorreto', 'inconsistencia'], situation: 'Em correcao de rota' },
  { match: ['carteiro nao atendido', 'correio nao atendido', 'unidade fechada'], situation: 'Correio nao atendido' },
  { match: ['saiu para entrega', 'objeto saiu para entrega'], situation: 'saiu para entrega' },
  { match: ['preparando para entrega'], situation: 'Preparando para entrega' },
  { match: ['encaminhado', 'em transito', 'transferencia', 'em transferencia'], situation: 'Em transferencia' },
  { match: ['postado apos o horario', 'postado apos limite'], situation: 'Postado apos limite de horario' },
  { match: ['objeto postado', 'postado'], situation: 'Postado apos limite de horario' },
  { match: ['etiqueta'], situation: 'etiqueta' },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

function normalizeSituationForApp(value) {
  const normalized = normalizeText(value);
  const allowed = {
    'entregue': 'Entregue',
    'disponivel para retirada': 'Dispon\u00edvel para Retirada',
    'nao encontrado na base dados': 'N\u00e3o encontrado na Base dados',
    'manifestacao': 'Manifesta\u00e7\u00e3o',
    'nao entregue': 'N\u00c3O ENTREGUE',
    'em correcao de rota': 'Em corre\u00e7\u00e3o de rota',
    'correio nao atendido': 'Correio n\u00e3o atendido',
    'em transferencia': 'Em transferencia',
    'preparando para entrega': 'Preparando para entrega',
    'saiu para entrega': 'saiu para entrega',
    'postado apos limite de horario': 'Postado ap\u00f3s limite de hor\u00e1rio',
    'etiqueta': 'etiqueta',
  };

  return allowed[normalized] || 'etiqueta';
}

function inferDeliverySituation(event) {
  const text = normalizeText(`${event?.descricao || ''} ${event?.codigo || ''} ${event?.tipo || ''}`);
  const mapped = deliveryMap.find((item) => item.match.some((pattern) => text.includes(pattern)));
  return normalizeSituationForApp(mapped?.situation || 'etiqueta');
}

function getExpectedDeliveryDate(object) {
  const value = object?.dtPrevista || object?.dataPrevista || object?.prazoEntrega;
  if (!value) return '';

  return String(value).slice(0, 10);
}

function parseCorreiosResult(id, trackingCode, data) {
  const object = data?.objetos?.find((item) => item.codObjeto === trackingCode) || data?.objetos?.[0];
  const latestEvent = object?.eventos?.[0];

  if (!object || !latestEvent || (data?.quantidade !== undefined && Number(data.quantidade) === 0)) {
    return { id, trackingCode, updated: false };
  }

  if (normalizeText(latestEvent.descricao).includes('nao encontrado')) {
    return { id, trackingCode, updated: false };
  }

  return {
    id,
    trackingCode,
    updated: true,
    deliverySituation: inferDeliverySituation(latestEvent),
    expectedDeliveryDate: getExpectedDeliveryDate(object),
  };
}

async function verifySupabaseToken(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!supabaseUrl || !supabaseAnonKey) return true;
  if (!token) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);

  return !error && Boolean(data?.user);
}

async function getCorreiosToken() {
  if (process.env.CORREIOS_API_TOKEN) return process.env.CORREIOS_API_TOKEN;

  const username = process.env.CORREIOS_USERNAME;
  const accessCode = process.env.CORREIOS_ACCESS_CODE;
  const postCard = process.env.CORREIOS_POST_CARD;

  if (!username || !accessCode) {
    throw new Error('Credenciais dos Correios nao configuradas.');
  }

  const body = postCard ? JSON.stringify({ numero: postCard }) : undefined;
  const response = await fetch(CORREIOS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${accessCode}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.token) {
    throw new Error(data.mensagem || data.message || 'Nao foi possivel gerar token dos Correios.');
  }

  return data.token;
}

async function fetchCorreiosTracking(trackingCode, token) {
  const url = `${CORREIOS_RASTRO_ENDPOINT.replace(/\/$/, '')}/${encodeURIComponent(trackingCode)}?resultado=T`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, data };
  }

  return { ok: true, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Metodo nao permitido.' });
    return;
  }

  const isAuthorized = await verifySupabaseToken(req);
  if (!isAuthorized) {
    res.status(401).json({ message: 'Login necessario para atualizar rastreios.' });
    return;
  }

  const body = getRequestBody(req);
  const objects = Array.isArray(body.objects) ? body.objects : [];
  if (objects.length === 0) {
    res.status(400).json({ message: 'Nenhum rastreio informado.' });
    return;
  }

  try {
    const token = await getCorreiosToken();
    const results = [];

    for (const object of objects.slice(0, 50)) {
      const trackingCode = String(object.trackingCode || '').trim().toUpperCase();

      if (!trackingCode) {
        results.push({ id: object.id, trackingCode, updated: false });
        continue;
      }

      const { ok, data } = await fetchCorreiosTracking(trackingCode, token);
      results.push(ok ? parseCorreiosResult(object.id, trackingCode, data) : { id: object.id, trackingCode, updated: false });
    }

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Nao foi possivel consultar os Correios.' });
  }
}
