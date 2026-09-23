import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { fetchLeads, updateLeadStatus } from '../api';
import { SITE_URL } from '../config';

const STATUS_LABELS = {
  new: 'Pendiente',
  contacted: 'Contactado',
  approved: 'Aprobado',
  rejected: 'Descartado'
};

const FILTERS = ['all', 'new', 'contacted', 'approved', 'rejected'];

const ACTIONS = [
  { status: 'contacted', icon: '📞', label: 'Marcar como Contactado', className: 'lead-btn-contact' },
  { status: 'approved', icon: '✅', label: 'Aprobar Alianza', className: 'lead-btn-approve' },
  { status: 'rejected', icon: '❌', label: 'Descartar', className: 'lead-btn-reject' }
];

const SUCCESS_TEXT = {
  contacted: (lead) => `${lead.schoolName} quedó como contactada.`,
  approved: (lead) => `${lead.schoolName} ya figura en el directorio público.`,
  rejected: (lead) => `${lead.schoolName} quedó descartada.`
};

const SWAL_THEME = {
  background: '#151b2b',
  color: '#f4f7ff',
  customClass: { popup: 'swal-glass' }
};

const toast = Swal.mixin({
  ...SWAL_THEME,
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '';
}

export default function LeadsPage() {
  const { query: globalQuery = '' } = useOutletContext() || {};
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchLeads();
      setLeads(payload.leads || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(lead, status) {
    if (lead.published && status !== 'approved') {
      const { isConfirmed } = await Swal.fire({
        ...SWAL_THEME,
        icon: 'warning',
        title: '¿Sacarla del directorio?',
        text: `${lead.schoolName} está publicada y dejará de figurar en el directorio.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#fb7185'
      });
      if (!isConfirmed) return;
    }

    setBusyId(lead.id);
    try {
      const { lead: updated } = await updateLeadStatus(lead.id, status);
      setLeads((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.fire({ icon: 'success', iconColor: '#34d399', title: STATUS_LABELS[status], text: SUCCESS_TEXT[status](updated) });
    } catch (err) {
      const expired = err.status === 401;
      toast.fire({
        icon: 'error',
        iconColor: '#fb7185',
        title: expired ? 'Sesión expirada' : err.status === 403 ? 'Sin permisos' : 'No se pudo actualizar',
        text: expired ? 'Te llevamos a ingresar de nuevo…' : err.message,
        timer: expired ? 1800 : 5000
      });
      if (expired) {
        window.setTimeout(() => {
          window.location.href = `${SITE_URL}/users/login?expired=1&next=${encodeURIComponent('/central/leads')}`;
        }, 1800);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="status">Cargando leads…</p>;

  if (error) {
    const needsLogin = error.status === 401 || error.status === 403;
    return (
      <section className="dash-page">
        <h1>Leads B2B · Autoescuelas</h1>
        <article className="glass">
          <p className="error">{error.message}</p>
          {needsLogin ? (
            <a className="btn-ghost" href={`${SITE_URL}/users/login?next=${encodeURIComponent('/central/leads')}`}>
              Ingresar como admin
            </a>
          ) : (
            <button type="button" className="btn-ghost" onClick={load}>Reintentar</button>
          )}
        </article>
      </section>
    );
  }

  const term = (search || globalQuery).trim().toLowerCase();
  const visible = leads.filter((lead) => {
    if (filter !== 'all' && lead.status !== filter) return false;
    if (!term) return true;
    return `${lead.schoolName} ${lead.contactName} ${lead.email}`.toLowerCase().includes(term);
  });
  const countOf = (status) => (status === 'all' ? leads.length : leads.filter((lead) => lead.status === status).length);

  return (
    <section className="dash-page">
      <h1>Leads B2B · Autoescuelas</h1>
      <div className="lead-toolbar">
        <div className="lead-filters" role="tablist" aria-label="Filtrar por estado">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              className={`lead-filter ${filter === status ? 'is-active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'Todos' : STATUS_LABELS[status]}
              <span>{countOf(status)}</span>
            </button>
          ))}
        </div>
        <label className="lead-search">
          <span className="sr-only">Buscar lead</span>
          <input
            type="search"
            placeholder="Buscar por escuela o email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <article className="glass table-wrap">
        {visible.length === 0 ? (
          <p className="muted">No hay solicitudes para este filtro.</p>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Autoescuela</th>
                <th>Contacto</th>
                <th>Zona</th>
                <th>Alumnos / Flota</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => {
                const busy = busyId === lead.id;
                return (
                  <tr key={lead.id} className={busy ? 'is-busy' : ''}>
                    <td>
                      <strong>{lead.schoolName}</strong>
                      <p className="muted lead-meta">Recibida {formatDate(lead.createdAt)}</p>
                      {lead.message && <p className="muted lead-message">{lead.message}</p>}
                    </td>
                    <td>
                      {lead.contactName}
                      <br />
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                      <br />
                      <span className="muted">{lead.phoneDisplay}</span>{' '}
                      <a className="lead-wa-link" href={lead.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    </td>
                    <td>
                      {lead.neighborhood}
                      <br />
                      <span className="muted">{lead.zone}</span>
                    </td>
                    <td className="lead-numbers">
                      <span>{lead.monthlyStudents ?? '—'} <small className="muted">alumnos/mes</small></span>
                      <span>{lead.fleetSize ?? '—'} <small className="muted">vehículos</small></span>
                    </td>
                    <td>
                      <span className={`lead-status lead-status-${lead.status}`}>{STATUS_LABELS[lead.status]}</span>
                      {lead.statusChangedAt && (
                        <p className="muted lead-meta">
                          {formatDate(lead.statusChangedAt)}
                          {lead.statusChangedBy && <><br />por {lead.statusChangedBy.name}</>}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="lead-actions">
                        {ACTIONS.map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            className={`lead-btn ${action.className}`}
                            disabled={busy || lead.status === action.status}
                            onClick={() => changeStatus(lead, action.status)}
                          >
                            <span aria-hidden="true">{action.icon}</span> {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
