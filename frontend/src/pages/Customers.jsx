import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomersAPI } from "../api/resources.js";
import { extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import { IconPlus, IconSearch, IconTrash, IconUsers } from "../components/icons.jsx";
import {
  EmptyState,
  Field,
  formatDate,
  PageHeader,
  SortTh,
  useSortable,
} from "../components/ui.jsx";

const EMPTY_FORM = { full_name: "", email: "", phone: "", address: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const e = {};
  if (!form.full_name.trim()) e.full_name = "Full name is required.";
  if (!form.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address.";
  return e;
}
function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await CustomersAPI.list());
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [customers, search]);

  const { sorted, sort, toggle } = useSortable(filtered, "full_name");

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }
  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      await CustomersAPI.create({
        full_name: form.full_name.trim(), email: form.email.trim(),
        phone: form.phone.trim() || null, address: form.address.trim() || null,
      });
      toast.success("Customer added.");
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await CustomersAPI.remove(toDelete.id);
      toast.success("Customer deleted.");
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Customers"
        subtitle="Manage the people who buy from you."
        actions={
          <button className="btn btn--primary" onClick={openCreate}>
            <IconPlus width={16} height={16} /> Add Customer
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <IconSearch width={16} height={16} />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
        </div>
        <span className="muted">{sorted.length} customer(s)</span>
      </div>

      <div className="card card--table">
        {loading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<IconUsers width={40} height={40} />}
            title={search ? "No matching customers" : "No customers yet"}
            message={search ? "Try a different search term." : "Add your first customer to start creating orders."}
            action={!search && <button className="btn btn--primary" onClick={openCreate}><IconPlus width={16} height={16} /> Add Customer</button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <SortTh label="Customer" field="full_name" sort={sort} onSort={toggle} />
                  <SortTh label="Email" field="email" sort={sort} onSort={toggle} />
                  <th>Phone</th>
                  <SortTh label="Added" field="created_at" sort={sort} onSort={toggle} />
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="customer-cell">
                        <span className="avatar">{initials(c.full_name)}</span>
                        <div>
                          <div className="cell-strong">{c.full_name}</div>
                          {c.address && <div className="cell-sub">{c.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || "—"}</td>
                    <td className="muted">{formatDate(c.created_at)}</td>
                    <td className="actions-col">
                      <button className="icon-btn icon-btn--danger" onClick={() => setToDelete(c)} aria-label={`Delete ${c.full_name}`} title="Delete"><IconTrash width={18} height={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Add Customer"
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn--primary" onClick={submit} disabled={saving}>
              {saving && <span className="btn-spin" />}
              {saving ? "Saving…" : "Add Customer"}
            </button>
          </>
        }
      >
        <form className="form-grid" onSubmit={submit}>
          <Field label="Full Name" required error={errors.full_name}>
            <input className="input" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} placeholder="e.g. Jane Doe" autoFocus />
          </Field>
          <Field label="Email" required error={errors.email} hint="Must be unique.">
            <input className="input" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="jane@example.com" />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+91 90000 00000" />
          </Field>
          <Field label="Address">
            <input className="input" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="City, Country" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete customer?"
        message={toDelete ? `“${toDelete.full_name}” will be removed. Customers with existing orders cannot be deleted.` : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}
