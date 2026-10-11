/**
 * Library Management System - Fine & Overdue Management Controller
 */

let allFines = [];
let overdueIssues = [];

document.addEventListener("DOMContentLoaded", () => {
  if (auth.isAuthenticated()) {
    loadOverdueIssues();
    loadFines();
    setupEventListeners();
  }
});

function setupEventListeners() {
  const searchInput = document.getElementById("fine-search-input");
  const statusFilter = document.getElementById("fine-status-filter");

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadFines();
      }, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      loadFines();
    });
  }

  const payForm = document.getElementById("pay-fine-form");
  if (payForm) {
    payForm.addEventListener("submit", handlePayFine);
  }

  const waiveForm = document.getElementById("waive-fine-form");
  if (waiveForm) {
    waiveForm.addEventListener("submit", handleWaiveFine);
  }
}

async function loadOverdueIssues() {
  const tbody = document.getElementById("overdue-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-danger spinner-border-sm me-2"></div>Checking overdue borrowings...</td></tr>`;

  try {
    const res = await api.get("/issues", { status: "OVERDUE" });
    if (res && res.success && res.data) {
      overdueIssues = res.data;
      renderOverdueTable(overdueIssues);
    }
  } catch (error) {
    console.error("Failed to load overdue issues:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error loading overdue items.</td></tr>`;
  }
}

function renderOverdueTable(overdue) {
  const tbody = document.getElementById("overdue-table-body");
  const badge = document.getElementById("overdue-count-badge");
  if (badge) badge.textContent = `${overdue.length} Overdue`;

  if (overdue.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          <i class="bi bi-check-circle-fill text-success me-1"></i> No books currently overdue! All borrowings are within deadline.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = overdue.map(item => {
    return `
      <tr>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(item.bookTitle)}</div>
          <small class="text-muted">ISBN: ${escapeHtml(item.bookIsbn)}</small>
        </td>
        <td>
          <div class="fw-medium">${escapeHtml(item.studentName)}</div>
          <small class="text-muted">${escapeHtml(item.studentIdentifier)} | ${escapeHtml(item.studentEmail)}</small>
        </td>
        <td>${item.dueDate}</td>
        <td><span class="badge bg-danger text-white">${item.overdueDays} Days</span></td>
        <td class="fw-bold text-danger">$${parseFloat(item.fineAmount || 0).toFixed(2)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success py-1 px-2" onclick="quickReturnOverdue(${item.id}, '${escapeHtml(item.bookTitle)}')">
            <i class="bi bi-arrow-return-left me-1"></i> Return Now
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadFines() {
  const tbody = document.getElementById("fines-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Loading fines registry...</td></tr>`;

  const query = document.getElementById("fine-search-input")?.value || "";
  const status = document.getElementById("fine-status-filter")?.value || "";

  try {
    const res = await api.get("/fines", { query, status });
    if (res && res.success && res.data) {
      allFines = res.data;
      renderFinesTable(allFines);
    }
  } catch (error) {
    console.error("Failed to load fines:", error);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load fines. ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderFinesTable(fines) {
  const tbody = document.getElementById("fines-table-body");
  const countBadge = document.getElementById("fines-count-badge");
  if (countBadge) countBadge.textContent = `${fines.length} Fines`;

  if (fines.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="state-container">
          <i class="bi bi-cash-coin"></i>
          <h5>No fines found</h5>
          <p>No late penalties or fines recorded matching the current filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = fines.map(f => {
    let badgeClass = "badge-pending";
    if (f.status === "PAID") badgeClass = "badge-paid";
    if (f.status === "WAIVED") badgeClass = "badge-waived";

    return `
      <tr>
        <td><code>#FN-${f.id}</code></td>
        <td>
          <div class="fw-medium">${escapeHtml(f.studentName)}</div>
          <small class="text-muted">${escapeHtml(f.studentIdentifier)}</small>
        </td>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(f.bookTitle)}</div>
        </td>
        <td>${f.overdueDays} Days</td>
        <td class="fw-bold ${f.status === 'PENDING' ? 'text-danger' : 'text-dark'}">$${parseFloat(f.amount).toFixed(2)}</td>
        <td>
          <span class="badge-status ${badgeClass}">
            <i class="bi bi-circle-fill" style="font-size: 6px;"></i>
            ${f.status}
          </span>
        </td>
        <td>
          ${f.paidDate ? `<span class="small text-muted">${f.paidDate}<br><code>${escapeHtml(f.paymentReference || "")}</code></span>` : `<span class="text-muted">-</span>`}
        </td>
        <td class="text-end">
          <div class="btn-action-group">
            ${f.status === "PENDING" ? `
              <button class="btn btn-sm btn-success py-1 px-2" title="Accept Payment" onclick="openPayFineModal(${f.id}, ${f.amount}, '${escapeHtml(f.studentName)}')">
                <i class="bi bi-credit-card me-1"></i>Pay
              </button>
              <button class="btn btn-sm btn-outline-secondary py-1 px-2 ms-1" title="Waive Fine" onclick="openWaiveFineModal(${f.id})">
                <i class="bi bi-slash-circle me-1"></i>Waive
              </button>
            ` : `
              <span class="badge bg-light text-muted border py-1 px-2">Settled</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openPayFineModal(fineId, amount, studentName) {
  document.getElementById("pay-fine-id").value = fineId;
  document.getElementById("pay-fine-student").textContent = studentName;
  document.getElementById("pay-fine-amount").textContent = `$${parseFloat(amount).toFixed(2)}`;
  document.getElementById("pay-fine-ref").value = `REC-${Date.now().toString().slice(-6)}`;

  const modal = new bootstrap.Modal(document.getElementById("payFineModal"));
  modal.show();
}

async function handlePayFine(e) {
  e.preventDefault();

  const fineId = document.getElementById("pay-fine-id").value;
  const paymentReference = document.getElementById("pay-fine-ref").value.trim();

  try {
    const res = await api.post(`/fines/${fineId}/pay`, { paymentReference });
    if (res && res.success) {
      showToast("success", "Fine Paid", "Payment recorded successfully.");
      
      const modalEl = document.getElementById("payFineModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      loadFines();
    }
  } catch (error) {
    showToast("error", "Payment Failed", error.message);
  }
}

function openWaiveFineModal(fineId) {
  document.getElementById("waive-fine-id").value = fineId;
  document.getElementById("waive-fine-reason").value = "";

  const modal = new bootstrap.Modal(document.getElementById("waiveFineModal"));
  modal.show();
}

async function handleWaiveFine(e) {
  e.preventDefault();

  const fineId = document.getElementById("waive-fine-id").value;
  const reason = document.getElementById("waive-fine-reason").value.trim();

  try {
    const res = await api.post(`/fines/${fineId}/waive`, { reason });
    if (res && res.success) {
      showToast("info", "Fine Waived", "Penalty waived by administrator.");

      const modalEl = document.getElementById("waiveFineModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      loadFines();
    }
  } catch (error) {
    showToast("error", "Action Failed", error.message);
  }
}

async function quickReturnOverdue(issueId, bookTitle) {
  if (!confirm(`Process return of "${bookTitle}"? Late fine will be finalized.`)) return;

  try {
    const res = await api.post(`/issues/${issueId}/return`, {
      returnDate: new Date().toISOString().split("T")[0],
      notes: "Returned via Overdue Manager"
    });

    if (res && res.success) {
      showToast("success", "Returned", `"${bookTitle}" returned.`);
      loadOverdueIssues();
      loadFines();
    }
  } catch (error) {
    showToast("error", "Return Failed", error.message);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
