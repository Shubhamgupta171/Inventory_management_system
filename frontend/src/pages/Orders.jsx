import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomersAPI, OrdersAPI, ProductsAPI } from "../api/resources.js";
import { extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import {
  IconCart,
  IconEye,
  IconPlus,
  IconTrash,
} from "../components/icons.jsx";
import {
  Badge,
  EmptyState,
  Field,
  formatDate,
  money,
  PageHeader,
  Spinner,
} from "../components/ui.jsx";

const newLine = () => ({ key: Math.random().toString(36).slice(2), product_id: "", quantity: 1 });

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([newLine()]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [String(p.id), p])),
    [products]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p, c] = await Promise.all([
        OrdersAPI.list(),
        ProductsAPI.list(),
        CustomersAPI.list(),
      ]);
      setOrders(o);
      setProducts(p);
      setCustomers(c);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Order builder helpers ----
  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, ln) => {
      const p = productById[ln.product_id];
      const qty = Number(ln.quantity) || 0;
      return sum + (p ? Number(p.price) * qty : 0);
    }, 0);
  }, [lines, productById]);

  function openCreate() {
    setCustomerId("");
    setLines([newLine()]);
    setFormError("");
    setCreateOpen(true);
  }

  function updateLine(key, patch) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, newLine()]);
  }

  function removeLine(key) {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((l) => l.key !== key)));
  }

  function validateOrder() {
    if (!customerId) return "Please select a customer.";
    const chosen = lines.filter((l) => l.product_id);
    if (chosen.length === 0) return "Add at least one product.";
    for (const ln of chosen) {
      const p = productById[ln.product_id];
      const qty = Number(ln.quantity);
      if (!Number.isInteger(qty) || qty < 1)
        return `Quantity for “${p?.name || "product"}” must be at least 1.`;
      if (p && qty > p.stock_quantity)
        return `Only ${p.stock_quantity} in stock for “${p.name}”.`;
    }
    // Detect duplicate products selected across lines
    const ids = chosen.map((l) => l.product_id);
    if (new Set(ids).size !== ids.length)
      return "The same product is selected more than once — combine the quantities.";
    return "";
  }

  async function submitOrder(e) {
    e?.preventDefault();
    const err = validateOrder();
    setFormError(err);
    if (err) return;

    const payload = {
      customer_id: Number(customerId),
      items: lines
        .filter((l) => l.product_id)
        .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
    };

    setSaving(true);
    try {
      await OrdersAPI.create(payload);
      toast.success("Order created and stock updated.");
      setCreateOpen(false);
      await load();
    } catch (err2) {
      toast.error(extractError(err2));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await OrdersAPI.remove(toDelete.id);
      toast.success("Order cancelled and stock restored.");
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDeleting(false);
    }
  }

  const canCreate = customers.length > 0 && products.length > 0;

  return (
    <div className="stack">
      <PageHeader
        title="Orders"
        subtitle="Create orders and track inventory movements."
        actions={
          <button
            className="btn btn--primary"
            onClick={openCreate}
            disabled={!canCreate}
            title={!canCreate ? "Add a customer and a product first" : undefined}
          >
            <IconPlus width={16} height={16} />
            New Order
          </button>
        }
      />

      <div className="card card--table">
        {loading ? (
          <Spinner label="Loading orders…" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<IconCart width={40} height={40} />}
            title="No orders yet"
            message={
              canCreate
                ? "Create your first order to see it here."
                : "Add at least one customer and one product before creating an order."
            }
            action={
              canCreate && (
                <button className="btn btn--primary" onClick={openCreate}>
                  <IconPlus width={16} height={16} /> New Order
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Placed</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><span className="order-id">#{o.id}</span></td>
                    <td>
                      <div className="cell-strong">{o.customer?.full_name}</div>
                      <div className="cell-sub">{o.customer?.email}</div>
                    </td>
                    <td className="num">
                      {o.items.reduce((s, i) => s + i.quantity, 0)}
                    </td>
                    <td className="num cell-strong">{money(o.total_amount)}</td>
                    <td className="muted">{formatDate(o.created_at)}</td>
                    <td className="actions-col">
                      <button
                        className="icon-btn"
                        onClick={() => setViewing(o)}
                        aria-label={`View order ${o.id}`}
                        title="View details"
                      >
                        <IconEye width={18} height={18} />
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        onClick={() => setToDelete(o)}
                        aria-label={`Cancel order ${o.id}`}
                        title="Cancel order"
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

      {/* Create order */}
      <Modal
        open={createOpen}
        title="New Order"
        size="lg"
        onClose={() => !saving && setCreateOpen(false)}
        footer={
          <>
            <div className="modal-total">
              Estimated total: <strong>{money(estimatedTotal)}</strong>
            </div>
            <button
              className="btn btn--ghost"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btn--primary" onClick={submitOrder} disabled={saving}>
              {saving ? "Placing…" : "Place Order"}
            </button>
          </>
        }
      >
        <form className="stack" onSubmit={submitOrder}>
          <Field label="Customer" required>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </Field>

          <div className="lines">
            <div className="lines__head">
              <span>Products</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={addLine}>
                <IconPlus width={14} height={14} /> Add line
              </button>
            </div>

            {lines.map((ln) => {
              const p = productById[ln.product_id];
              const lineTotal = p ? Number(p.price) * (Number(ln.quantity) || 0) : 0;
              const over = p && Number(ln.quantity) > p.stock_quantity;
              return (
                <div className="line" key={ln.key}>
                  <select
                    className="input line__product"
                    value={ln.product_id}
                    onChange={(e) => updateLine(ln.key, { product_id: e.target.value })}
                  >
                    <option value="">Select product…</option>
                    {products.map((pr) => (
                      <option key={pr.id} value={pr.id} disabled={pr.stock_quantity === 0}>
                        {pr.name} — {money(pr.price)} ({pr.stock_quantity} in stock)
                      </option>
                    ))}
                  </select>
                  <input
                    className={`input line__qty ${over ? "input--error" : ""}`}
                    type="number"
                    min="1"
                    step="1"
                    value={ln.quantity}
                    onChange={(e) => updateLine(ln.key, { quantity: e.target.value })}
                    aria-label="Quantity"
                  />
                  <span className="line__total">{money(lineTotal)}</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => removeLine(ln.key)}
                    disabled={lines.length === 1}
                    aria-label="Remove line"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {formError && <div className="form-alert">{formError}</div>}
        </form>
      </Modal>

      {/* View order */}
      <Modal
        open={!!viewing}
        title={viewing ? `Order #${viewing.id}` : ""}
        onClose={() => setViewing(null)}
        footer={
          <button className="btn btn--ghost" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing && (
          <div className="stack">
            <div className="detail-row">
              <span className="muted">Customer</span>
              <span>
                <strong>{viewing.customer?.full_name}</strong>
                <div className="cell-sub">{viewing.customer?.email}</div>
              </span>
            </div>
            <div className="detail-row">
              <span className="muted">Placed</span>
              <span>{formatDate(viewing.created_at)}</span>
            </div>
            <div className="detail-row">
              <span className="muted">Status</span>
              <Badge tone="green">{viewing.status}</Badge>
            </div>

            <div className="table-wrap">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Unit</th>
                    <th className="num">Qty</th>
                    <th className="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.product_name}</td>
                      <td className="num">{money(it.unit_price)}</td>
                      <td className="num">{it.quantity}</td>
                      <td className="num">{money(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="num cell-strong">Total</td>
                    <td className="num cell-strong">{money(viewing.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Cancel order?"
        confirmLabel="Cancel Order"
        message={
          toDelete
            ? `Order #${toDelete.id} will be removed and the reserved stock returned to inventory.`
            : ""
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}
