import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../api/resources.js";
import { extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { IconBox, IconEdit, IconPlus, IconSearch, IconTrash } from "../components/icons.jsx";
import {
  Badge,
  EmptyState,
  Field,
  money,
  PageHeader,
  Spinner,
} from "../components/ui.jsx";

const EMPTY_FORM = { name: "", sku: "", price: "", stock_quantity: "", description: "" };
const LOW_STOCK = 10;

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = "Name is required.";
  if (!form.sku.trim()) e.sku = "SKU is required.";
  if (form.price === "" || Number(form.price) < 0 || Number.isNaN(Number(form.price)))
    e.price = "Enter a valid price (≥ 0).";
  if (
    form.stock_quantity === "" ||
    !Number.isInteger(Number(form.stock_quantity)) ||
    Number(form.stock_quantity) < 0
  )
    e.stock_quantity = "Enter a whole number ≥ 0.";
  return e;
}

export default function Products() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await ProductsAPI.list());
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
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      price: String(p.price),
      stock_quantity: String(p.stock_quantity),
      description: p.description || "",
    });
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

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await ProductsAPI.update(editing.id, payload);
        toast.success("Product updated.");
      } else {
        await ProductsAPI.create(payload);
        toast.success("Product created.");
      }
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
      await ProductsAPI.remove(toDelete.id);
      toast.success("Product deleted.");
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
        title="Products"
        subtitle="Manage your catalogue and stock levels."
        actions={
          <button className="btn btn--primary" onClick={openCreate}>
            <IconPlus width={16} height={16} />
            Add Product
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <IconSearch width={16} height={16} />
          <input
            type="text"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <span className="muted">{filtered.length} item(s)</span>
      </div>

      <div className="card card--table">
        {loading ? (
          <Spinner label="Loading products…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconBox width={40} height={40} />}
            title={search ? "No matching products" : "No products yet"}
            message={
              search
                ? "Try a different search term."
                : "Add your first product to start tracking inventory."
            }
            action={
              !search && (
                <button className="btn btn--primary" onClick={openCreate}>
                  <IconPlus width={16} height={16} /> Add Product
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="num">Price</th>
                  <th className="num">In Stock</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-strong">{p.name}</div>
                      {p.description && (
                        <div className="cell-sub">{p.description}</div>
                      )}
                    </td>
                    <td><code className="sku">{p.sku}</code></td>
                    <td className="num">{money(p.price)}</td>
                    <td className="num">
                      <Badge
                        tone={
                          p.stock_quantity === 0
                            ? "rose"
                            : p.stock_quantity <= LOW_STOCK
                            ? "amber"
                            : "green"
                        }
                      >
                        {p.stock_quantity}
                      </Badge>
                    </td>
                    <td className="actions-col">
                      <button
                        className="icon-btn"
                        onClick={() => openEdit(p)}
                        aria-label={`Edit ${p.name}`}
                        title="Edit"
                      >
                        <IconEdit width={18} height={18} />
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        onClick={() => setToDelete(p)}
                        aria-label={`Delete ${p.name}`}
                        title="Delete"
                      >
                        <IconTrash width={18} height={18} />
                      </button>
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
        title={editing ? "Edit Product" : "Add Product"}
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button
              className="btn btn--ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn--primary"
              onClick={submit}
              disabled={saving}
              form="product-form"
              type="submit"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Product"}
            </button>
          </>
        }
      >
        <form id="product-form" className="form-grid" onSubmit={submit}>
          <Field label="Product Name" required error={errors.name}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Wireless Mouse"
              autoFocus
            />
          </Field>
          <Field label="SKU / Code" required error={errors.sku} hint="Must be unique.">
            <input
              className="input"
              value={form.sku}
              onChange={(e) => setField("sku", e.target.value)}
              placeholder="e.g. WM-001"
            />
          </Field>
          <Field label="Price (USD)" required error={errors.price}>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Quantity in Stock" required error={errors.stock_quantity}>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={form.stock_quantity}
              onChange={(e) => setField("stock_quantity", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Description" hint="Optional">
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Short description…"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete product?"
        message={
          toDelete
            ? `“${toDelete.name}” (${toDelete.sku}) will be permanently removed. Products referenced by existing orders cannot be deleted.`
            : ""
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}
