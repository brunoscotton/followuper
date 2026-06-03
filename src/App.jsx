import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'followuper.quotes.v1';

const sellers = ['Elton', 'Bruno', 'Stephanie'];

const statuses = [
  { value: 'sem-resposta', label: 'Sem resposta', color: 'yellow' },
  { value: 'negociacao', label: 'Em negociação', color: 'orange' },
  { value: 'fechada', label: 'Fechada', color: 'red' },
];

const tabs = [
  { value: 'abertas', label: 'Cotações em aberto' },
  { value: 'followup', label: 'Cotações para Follow-up' },
  { value: 'fechadas', label: 'Cotações fechadas' },
  { value: 'todas', label: 'Visualizar todas' },
];

const initialForm = {
  quoteNumber: '',
  clientName: '',
  paymentTerms: '',
  quoteDate: getTodayInputValue(),
  seller: 'Elton',
  followUpDays: 1,
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateValue));
}

function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function normalize(text) {
  return text.toString().trim().toLowerCase();
}

function loadQuotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function getStatusMeta(status) {
  return statuses.find((item) => item.value === status) || statuses[0];
}

function isClosed(quote) {
  return quote.status === 'fechada';
}

function isFollowUpDue(quote, now) {
  return !isClosed(quote) && addDays(quote.createdAt, quote.followUpDays) <= now;
}

function isStatusUnchanged(quote, now) {
  const oneDayAfterCreation = addDays(quote.createdAt, 1);
  return !isClosed(quote) && quote.statusUpdatedAt === quote.createdAt && oneDayAfterCreation <= now;
}

export function App() {
  const [quotes, setQuotes] = useState(loadQuotes);
  const [form, setForm] = useState(initialForm);
  const [activeTab, setActiveTab] = useState('abertas');
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }, [quotes]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const followUpDue = quotes.filter((quote) => isFollowUpDue(quote, now));
    const unchangedStatus = quotes.filter((quote) => isStatusUnchanged(quote, now));

    return {
      abertas: quotes.filter((quote) => !isClosed(quote)).length,
      followup: followUpDue.length,
      fechadas: quotes.filter(isClosed).length,
      todas: quotes.length,
      followUpDue: followUpDue.length,
      unchangedStatus: unchangedStatus.length,
    };
  }, [quotes, now]);

  const visibleQuotes = useMemo(() => {
    const query = normalize(searchTerm);

    return quotes
      .filter((quote) => {
        if (activeTab === 'abertas') return !isClosed(quote);
        if (activeTab === 'followup') return isFollowUpDue(quote, now);
        if (activeTab === 'fechadas') return isClosed(quote);
        return true;
      })
      .filter((quote) => {
        if (!query) return true;
        return normalize(quote.clientName).includes(query) || normalize(quote.quoteNumber).includes(query);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeTab, now, quotes, searchTerm]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.quoteNumber.trim()) nextErrors.quoteNumber = 'Informe o número da cotação.';
    if (!form.clientName.trim()) nextErrors.clientName = 'Informe o nome do cliente.';
    if (!form.quoteDate) nextErrors.quoteDate = 'Informe a data da cotação.';
    if (!form.seller) nextErrors.seller = 'Selecione o vendedor.';
    if (!form.followUpDays || Number(form.followUpDays) < 1) {
      nextErrors.followUpDays = 'Use pelo menos 1 dia.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const createdAt = new Date().toISOString();
    const nextQuote = {
      id: crypto.randomUUID(),
      quoteNumber: form.quoteNumber.trim(),
      clientName: form.clientName.trim(),
      paymentTerms: form.paymentTerms.trim(),
      quoteDate: form.quoteDate,
      seller: form.seller,
      followUpDays: Number(form.followUpDays),
      status: 'sem-resposta',
      createdAt,
      statusUpdatedAt: createdAt,
    };

    setQuotes((current) => [nextQuote, ...current]);
    setForm({ ...initialForm, quoteDate: getTodayInputValue() });
    setActiveTab('abertas');
  }

  function changeStatus(id, status) {
    setQuotes((current) =>
      current.map((quote) =>
        quote.id === id
          ? {
              ...quote,
              status,
              statusUpdatedAt: new Date().toISOString(),
            }
          : quote,
      ),
    );
  }

  function removeQuote(id) {
    setQuotes((current) => current.filter((quote) => quote.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Dashboard comercial</p>
          <h1>Followuper</h1>
        </div>
        <div className="top-actions" aria-live="polite">
          <button className="alert-tab" type="button" onClick={() => setActiveTab('followup')}>
            <Bell size={18} />
            <span>({metrics.followUpDue}) Cotações precisam de Follow-up</span>
          </button>
          <button className="alert-tab muted" type="button" onClick={() => setActiveTab('abertas')}>
            <AlertTriangle size={18} />
            <span>({metrics.unchangedStatus}) Cotações sem alteração de status</span>
          </button>
        </div>
      </section>

      <section className="workspace-grid">
        <form className="quote-form" onSubmit={handleSubmit} noValidate>
          <div className="section-title">
            <FileText size={20} />
            <h2>Nova cotação</h2>
          </div>

          <label>
            Nº cotação
            <input
              value={form.quoteNumber}
              onChange={(event) => updateForm('quoteNumber', event.target.value)}
              placeholder="Ex: 10482"
            />
            {errors.quoteNumber && <small>{errors.quoteNumber}</small>}
          </label>

          <label>
            Nome do cliente
            <input
              value={form.clientName}
              onChange={(event) => updateForm('clientName', event.target.value)}
              placeholder="Ex: ACME Ltda."
            />
            {errors.clientName && <small>{errors.clientName}</small>}
          </label>

          <label>
            Condição de pagamento
            <input
              value={form.paymentTerms}
              onChange={(event) => updateForm('paymentTerms', event.target.value)}
              placeholder="Opcional"
            />
          </label>

          <div className="form-pair">
            <label>
              Data de cotação
              <input
                type="date"
                value={form.quoteDate}
                onChange={(event) => updateForm('quoteDate', event.target.value)}
              />
              {errors.quoteDate && <small>{errors.quoteDate}</small>}
            </label>

            <label>
              Follow-up em dias
              <input
                type="number"
                min="1"
                value={form.followUpDays}
                onChange={(event) => updateForm('followUpDays', event.target.value)}
              />
              {errors.followUpDays && <small>{errors.followUpDays}</small>}
            </label>
          </div>

          <label>
            Vendedor
            <select value={form.seller} onChange={(event) => updateForm('seller', event.target.value)}>
              {sellers.map((seller) => (
                <option key={seller} value={seller}>
                  {seller}
                </option>
              ))}
            </select>
            {errors.seller && <small>{errors.seller}</small>}
          </label>

          <button className="primary-button" type="submit">
            <Plus size={18} />
            Adicionar cotação
          </button>
        </form>

        <section className="quotes-panel">
          <div className="panel-toolbar">
            <div className="section-title">
              <CircleDot size={20} />
              <h2>Cotações</h2>
            </div>
            <label className="search-box">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cliente ou Nº cotação"
              />
            </label>
          </div>

          <div className="tabs" role="tablist" aria-label="Categorias de cotações">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.value ? 'tab active' : 'tab'}
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
                <strong>{metrics[tab.value]}</strong>
              </button>
            ))}
          </div>

          <div className="legend" aria-label="Legenda de status">
            <span>
              <i className="dot yellow" /> Sem resposta
            </span>
            <span>
              <i className="dot orange" /> Em negociação
            </span>
            <span>
              <i className="dot red" /> Fechada
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nº cotação</th>
                  <th>Cliente</th>
                  <th>Pagamento</th>
                  <th>Data cotação</th>
                  <th>Vendedor</th>
                  <th>Follow-up</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleQuotes.map((quote) => {
                  const statusMeta = getStatusMeta(quote.status);
                  const dueAt = addDays(quote.createdAt, quote.followUpDays);
                  const due = isFollowUpDue(quote, now);
                  const unchanged = isStatusUnchanged(quote, now);

                  return (
                    <tr className={`quote-row ${statusMeta.color}`} key={quote.id}>
                      <td>
                        <div className="status-cell">
                          <i className={`dot ${statusMeta.color}`} />
                          <select value={quote.status} onChange={(event) => changeStatus(quote.id, event.target.value)}>
                            {statuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="strong-text">{quote.quoteNumber}</td>
                      <td>{quote.clientName}</td>
                      <td>{quote.paymentTerms || '—'}</td>
                      <td>{formatDate(`${quote.quoteDate}T12:00:00`)}</td>
                      <td>{quote.seller}</td>
                      <td>
                        <div className="due-cell">
                          {due ? <CalendarClock size={16} /> : <Clock3 size={16} />}
                          <span>{formatDateTime(dueAt)}</span>
                          {due && <b>Follow-up</b>}
                          {unchanged && <b className="neutral">Sem alteração</b>}
                        </div>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          type="button"
                          title="Remover cotação"
                          aria-label="Remover cotação"
                          onClick={() => removeQuote(quote.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visibleQuotes.length === 0 && (
              <div className="empty-state">
                <CheckCircle2 size={28} />
                <p>Nenhuma cotação encontrada nesta visualização.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
