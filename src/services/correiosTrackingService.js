import { getCurrentSession } from './authRepository';

const correiosCarrierPattern = /\b(correios?|sedex|pac)\b/i;
const correiosCodePattern = /^[A-Z]{2}\d{9}[A-Z]{2}$/i;

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isCorreiosTrackingCandidate(entry) {
  const carrier = normalizeSearchText(entry.carrier);
  const trackingCode = String(entry.trackingCode || '').trim();

  return Boolean(trackingCode) && (correiosCarrierPattern.test(carrier) || correiosCodePattern.test(trackingCode));
}

export async function requestCorreiosTrackingUpdate(entries) {
  const { session } = await getCurrentSession();
  const response = await fetch('/api/correios/update-tracking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      objects: entries.map((entry) => ({
        id: entry.id,
        trackingCode: entry.trackingCode,
      })),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Nao foi possivel atualizar os rastreios dos Correios.');
  }

  return data.results || [];
}
