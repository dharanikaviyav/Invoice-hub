const API_BASE = ""; // same origin

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

let clientsCache = [];
let itemsCache = [];
let currentInvoiceId = null;
let currentInvoiceData = null;

// -------- NAVIGATION --------

const views = {
  dashboard: document.getElementById("view-dashboard"),
  "create-invoice": document.getElementById("view-create-invoice"),
  clients: document.getElementById("view-clients"),
  items: document.getElementById("view-items"),
};

const pageTitle = document.getElementById("page-title");

function showView(id) {
  Object.values(views).forEach((v) => v.classList.remove("active"));
  views[id].classList.add("active");
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === id);
  });
  pageTitle.textContent =
    id === "dashboard"
      ? "Dashboard"
      : id === "create-invoice"
      ? "Create Invoice"
      : id === "clients"
      ? "Manage Clients"
      : "Manage Items";
}

document.querySelectorAll(".nav-link").forEach((btn) =>
  btn.addEventListener("click", () => showView(btn.dataset.view))
);

document.getElementById("btn-new-invoice").addEventListener("click", () => {
  showView("create-invoice");
});

// -------- MESSAGE HELPERS --------

function showMessage(containerId, text, type = "success") {
  const el = document.getElementById(containerId);
  if (!el) return;
  const cls = type === "success" ? "message-success" : "message-error";
  el.innerHTML = `<div class="${cls}">${text}</div>`;
  setTimeout(() => {
    el.innerHTML = "";
  }, 3000);
}

// -------- CLIENTS --------

async function loadClients() {
  const res = await fetch(`${API_BASE}/api/clients`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  clientsCache = data.clients || [];
  renderClientsTable();
  populateClientSelect();
}

function renderClientsTable() {
  const tbody = document.getElementById("clients-table-body");
  if (!clientsCache.length) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty-cell">No clients yet.</td></tr>';
    return;
  }
  tbody.innerHTML = clientsCache
    .map(
      (c) => `<tr>
        <td>${c.name}</td>
        <td>${c.email || ""}</td>
        <td>${(c.address || "").replace(/\n/g, "<br>")}</td>
      </tr>`
    )
    .join("");
}

function populateClientSelect() {
  const select = document.getElementById("invoice-client-select");
  select.innerHTML = '<option value="">Select client...</option>';
  clientsCache.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// add client (includes the required fetch snippet)
document
  .getElementById("client-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("client-name").value.trim();
    const email = document.getElementById("client-email").value.trim();
    const address = document.getElementById("client-address").value.trim();

    if (!name) {
      showMessage("clients-message", "Client name is required", "error");
      return;
    }

    try {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, address }),
      });

      await loadClients();
      document.getElementById("client-form").reset();
      showMessage("clients-message", "Client added successfully", "success");
    } catch (err) {
      showMessage(
        "clients-message",
        `Failed to add client: ${err.message}`,
        "error"
      );
    }
  });

// -------- ITEMS --------

async function loadItems() {
  const res = await fetch(`${API_BASE}/api/items`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  itemsCache = data.items || [];
  renderItemsTable();
}

function renderItemsTable() {
  const tbody = document.getElementById("items-table-body");
  if (!itemsCache.length) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty-cell">No items yet.</td></tr>';
    return;
  }
  tbody.innerHTML = itemsCache
    .map(
      (it) => `<tr>
        <td>${it.name}</td>
        <td>${formatCurrency(it.unit_price)}</td>
        <td>${it.gst_percent}%</td>
      </tr>`
    )
    .join("");
}

document.getElementById("item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  const priceVal = document.getElementById("item-price").value;
  const gstVal = document.getElementById("item-gst").value;

  if (!name) {
    showMessage("items-message", "Item name is required", "error");
    return;
  }
  const unit_price = parseFloat(priceVal);
  const gst_percent = parseFloat(gstVal);
  if (Number.isNaN(unit_price) || unit_price < 0) {
    showMessage("items-message", "Enter a valid unit price", "error");
    return;
  }
  if (Number.isNaN(gst_percent) || gst_percent < 0 || gst_percent > 100) {
    showMessage("items-message", "Enter a valid GST % (0–100)", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, unit_price, gst_percent }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    await loadItems();
    document.getElementById("item-form").reset();
    showMessage("items-message", "Item added successfully", "success");
  } catch (err) {
    showMessage("items-message", `Failed to add item: ${err.message}`, "error");
  }
});

// -------- INVOICE ITEMS TABLE --------

const itemsBody = document.getElementById("invoice-items-body");

function addInvoiceItemRow(prefill) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <select class="form-input item-select">
        <option value="">Custom item...</option>
        ${itemsCache
          .map(
            (it) =>
              `<option value="${it.id}" data-price="${it.unit_price}" data-gst="${it.gst_percent}">
                 ${it.name}
               </option>`
          )
          .join("")}
      </select>
      <input type="text" class="form-input item-name-input" placeholder="Item name">
    </td>
    <td><input type="number" class="form-input item-qty" min="1" step="1" value="${
      prefill?.quantity || 1
    }"></td>
    <td><input type="number" class="form-input item-price" min="0" step="0.01" value="${
      prefill?.unit_price || 0
    }"></td>
    <td><input type="number" class="form-input item-gst" min="0" max="100" step="0.01" value="${
      prefill?.gst_percent || 18
    }"></td>
    <td class="item-total-cell">₹0.00</td>
    <td><button type="button" class="btn btn-secondary btn-sm btn-remove-item">✕</button></td>
  `;
  itemsBody.appendChild(tr);
  bindRowEvents(tr);
  recalcInvoiceTotals();
}

function bindRowEvents(tr) {
  const select = tr.querySelector(".item-select");
  const nameInput = tr.querySelector(".item-name-input");
  const qtyInput = tr.querySelector(".item-qty");
  const priceInput = tr.querySelector(".item-price");
  const gstInput = tr.querySelector(".item-gst");
  const removeBtn = tr.querySelector(".btn-remove-item");

  select.addEventListener("change", () => {
    const selected = select.options[select.selectedIndex];
    const id = selected.value;
    if (id) {
      nameInput.value = selected.textContent.trim();
      priceInput.value = selected.dataset.price || "0";
      gstInput.value = selected.dataset.gst || "0";
    }
    recalcInvoiceTotals();
  });

  [qtyInput, priceInput, gstInput, nameInput].forEach((inp) =>
    inp.addEventListener("input", recalcInvoiceTotals)
  );

  removeBtn.addEventListener("click", () => {
    tr.remove();
    recalcInvoiceTotals();
  });
}

function recalcInvoiceTotals() {
  let subtotal = 0;
  let taxTotal = 0;
  itemsBody.querySelectorAll("tr").forEach((tr) => {
    const qty = parseFloat(tr.querySelector(".item-qty").value) || 0;
    const price = parseFloat(tr.querySelector(".item-price").value) || 0;
    const gst = parseFloat(tr.querySelector(".item-gst").value) || 0;

    const line = qty * price;
    const tax = (line * gst) / 100;
    const total = line + tax;
    subtotal += line;
    taxTotal += tax;
    tr.querySelector(".item-total-cell").textContent = formatCurrency(total);
  });
  document.getElementById("invoice-subtotal").textContent =
    formatCurrency(subtotal);
  document.getElementById("invoice-tax-total").textContent =
    formatCurrency(taxTotal);
  document.getElementById("invoice-grand-total").textContent = formatCurrency(
    subtotal + taxTotal
  );
}

document
  .getElementById("btn-add-item-row")
  .addEventListener("click", () => addInvoiceItemRow());

document
  .getElementById("btn-reset-invoice")
  .addEventListener("click", () => resetInvoiceForm());

function resetInvoiceForm() {
  document.getElementById("invoice-form").reset();
  itemsBody.innerHTML = "";
  addInvoiceItemRow();
  recalcInvoiceTotals();
  currentInvoiceId = null;
  currentInvoiceData = null;
  document.getElementById("invoice-preview-panel").classList.add("hidden");
}

// -------- SAVE INVOICE --------

document
  .getElementById("invoice-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const clientId = document.getElementById("invoice-client-select").value;
    if (!clientId) {
      showMessage(
        "invoice-form-message",
        "Please select a client",
        "error"
      );
      return;
    }
    const invoice_date = document.getElementById("invoice-date").value;
    const due_date = document.getElementById("invoice-due-date").value;
    const status = document.getElementById("invoice-status").value;
    const billing_address = document
      .getElementById("invoice-billing-address")
      .value.trim();
    const notes = document
      .getElementById("invoice-notes")
      .value.trim();

    const items = [];
    itemsBody.querySelectorAll("tr").forEach((tr) => {
      const select = tr.querySelector(".item-select");
      const nameInput = tr.querySelector(".item-name-input");
      const qty = parseFloat(tr.querySelector(".item-qty").value) || 0;
      const price = parseFloat(tr.querySelector(".item-price").value) || 0;
      const gst = parseFloat(tr.querySelector(".item-gst").value) || 0;
      const item_id = select.value ? parseInt(select.value) : null;
      const name = nameInput.value.trim();
      if (!name || qty <= 0 || price < 0) return;
      items.push({ item_id, name, quantity: qty, unit_price: price, gst_percent: gst });
    });

    if (!items.length) {
      showMessage(
        "invoice-form-message",
        "Add at least one valid item",
        "error"
      );
      return;
    }

    const payload = {
      client_id: parseInt(clientId),
      invoice_date,
      due_date,
      status,
      billing_address,
      notes,
      items,
    };

    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      showMessage(
        "invoice-form-message",
        `Invoice ${data.invoice_number} created successfully`,
        "success"
      );
      currentInvoiceId = data.invoice_id;
      await refreshDashboard();
      await loadInvoiceDetails(currentInvoiceId, true);
    } catch (err) {
      showMessage(
        "invoice-form-message",
        `Failed to save invoice: ${err.message}`,
        "error"
      );
    }
  });

// -------- DASHBOARD --------

async function loadInvoices() {
  const res = await fetch(`${API_BASE}/api/invoices`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data.invoices || [];
}

async function refreshDashboard() {
  try {
    const invoices = await loadInvoices();
    renderDashboardInvoices(invoices);
    computeDashboardStats(invoices);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

function renderDashboardInvoices(invoices) {
  const tbody = document.getElementById("dashboard-invoices-body");
  if (!invoices.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-cell">No invoices yet.</td></tr>';
    return;
  }
  const recent = invoices.slice(0, 5);
  tbody.innerHTML = recent
    .map(
      (inv) => `<tr>
      <td>${inv.invoice_number}</td>
      <td>${inv.client_name}</td>
      <td>${formatDate(inv.invoice_date)}</td>
      <td>${inv.status}</td>
      <td>${formatCurrency(inv.grand_total)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openInvoice(${inv.id})">View</button>
      </td>
    </tr>`
    )
    .join("");
}

function computeDashboardStats(invoices) {
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + (inv.grand_total || 0),
    0
  );
  const pending = invoices
    .filter((i) => i.status === "Pending")
    .reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

  document.getElementById("stat-total-invoices").textContent = totalInvoices;
  document.getElementById("stat-total-revenue").textContent =
    formatCurrency(totalRevenue);
  document.getElementById("stat-pending-amount").textContent =
    formatCurrency(pending);
}

window.openInvoice = async function (id) {
  await loadInvoiceDetails(id, true);
  showView("create-invoice");
};

// -------- INVOICE DETAILS / PREVIEW --------

async function loadInvoiceDetails(id, showPreview) {
  const res = await fetch(`${API_BASE}/api/invoices/${id}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  currentInvoiceId = id;
  currentInvoiceData = data.invoice;
  if (showPreview) {
    renderInvoicePreview(currentInvoiceData);
    document
      .getElementById("invoice-preview-panel")
      .classList.remove("hidden");
  }
}

function renderInvoicePreview(inv) {
  const container = document.getElementById("invoice-preview");
  const itemsRows = (inv.items || [])
    .map((it) => {
      const line = it.quantity * it.unit_price;
      const tax = (line * it.gst_percent) / 100;
      const total = line + tax;
      return `<tr>
        <td>${it.item_name}</td>
        <td style="text-align:center;">${it.quantity}</td>
        <td style="text-align:right;">${formatCurrency(it.unit_price)}</td>
        <td style="text-align:center;">${it.gst_percent}%</td>
        <td style="text-align:right;">${formatCurrency(total)}</td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <div class="preview-header">
      <div>
        <h3>Invoice Hub</h3>
        <p>Invoice #: <strong>${inv.invoice_number}</strong></p>
        <p>Date: ${formatDate(inv.invoice_date)}</p>
        <p>Due: ${formatDate(inv.due_date)}</p>
      </div>
      <div>
        <p><strong>Bill To:</strong></p>
        <p>${inv.client_name}</p>
        <p>${inv.client_email || ""}</p>
        <p>${(inv.client_address || "").replace(/\n/g, "<br>")}</p>
      </div>
    </div>
    <hr style="margin:0.5rem 0 0.75rem;">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit</th>
          <th style="text-align:center;">GST %</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="totals-row" style="margin-top:0.75rem;">
      <div></div>
      <div class="totals-box">
        <div class="totals-line">
          <span>Subtotal</span><span>${formatCurrency(inv.subtotal)}</span>
        </div>
        <div class="totals-line">
          <span>GST</span><span>${formatCurrency(inv.tax_total)}</span>
        </div>
        <div class="totals-line grand">
          <span>Grand Total</span><span>${formatCurrency(inv.grand_total)}</span>
        </div>
      </div>
    </div>
    <p style="margin-top:0.75rem;font-size:0.8rem;color:#6b7280;">Thank you for your business!</p>
  `;
}

// PRINT
document
  .getElementById("btn-print-invoice")
  .addEventListener("click", () => window.print());

// PDF via jsPDF
document
  .getElementById("btn-download-pdf")
  .addEventListener("click", () => {
    if (!currentInvoiceData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const inv = currentInvoiceData;

    let y = 10;
    doc.setFontSize(16);
    doc.text("Invoice Hub", 10, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Invoice #: ${inv.invoice_number}`, 10, y);
    y += 6;
    doc.text(`Date: ${inv.invoice_date}`, 10, y);
    y += 6;
    doc.text(`Due: ${inv.due_date}`, 10, y);

    y = 12;
    doc.setFontSize(11);
    doc.text("Bill To:", 120, y);
    y += 6;
    doc.text(inv.client_name || "", 120, y);
    y += 6;
    if (inv.client_email) {
      doc.text(inv.client_email, 120, y);
      y += 6;
    }
    if (inv.client_address) {
      String(inv.client_address)
        .split("\n")
        .forEach((line) => {
          doc.text(line, 120, y);
          y += 5;
        });
    }

    y += 4;
    doc.line(10, y, 200, y);
    y += 6;

    doc.setFontSize(10);
    doc.text("Item", 10, y);
    doc.text("Qty", 90, y);
    doc.text("Unit", 110, y);
    doc.text("GST%", 140, y);
    doc.text("Total", 170, y);
    y += 4;
    doc.line(10, y, 200, y);
    y += 6;

    (inv.items || []).forEach((it) => {
      const line = it.quantity * it.unit_price;
      const tax = (line * it.gst_percent) / 100;
      const total = line + tax;
      doc.text(String(it.item_name), 10, y);
      doc.text(String(it.quantity), 90, y, { align: "right" });
      doc.text(String(it.unit_price), 125, y, { align: "right" });
      doc.text(String(it.gst_percent), 150, y, { align: "right" });
      doc.text(String(total.toFixed(2)), 190, y, { align: "right" });
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 10;
      }
    });

    y += 4;
    doc.line(10, y, 200, y);
    y += 6;

    doc.text("Subtotal:", 140, y);
    doc.text(String(inv.subtotal.toFixed(2)), 190, y, { align: "right" });
    y += 6;
    doc.text("GST:", 140, y);
    doc.text(String(inv.tax_total.toFixed(2)), 190, y, { align: "right" });
    y += 6;
    doc.setFontSize(11);
    doc.text("Grand Total:", 140, y);
    doc.text(String(inv.grand_total.toFixed(2)), 190, y, { align: "right" });

    doc.save(`${inv.invoice_number}.pdf`);
  });

// -------- INIT --------

async function init() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("invoice-date").value = today;
  document.getElementById("invoice-due-date").value = today;

  await loadClients();
  await loadItems();
  resetInvoiceForm();
  await refreshDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => console.error("Init error:", err));
});
