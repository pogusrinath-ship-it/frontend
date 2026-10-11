/**
 * Library Management System - Book Issue & Return Management Controller
 */

let allIssues = [];
let availableBooks = [];
let registeredStudents = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (auth.isAuthenticated()) {
    await Promise.all([loadBooksForSelect(), loadStudentsForSelect()]);
    loadIssues();
    setupEventListeners();

    // Check URL parameters for quick-issue action from books or students table
    const urlParams = new URLSearchParams(window.location.search);
    const prefillBookId = urlParams.get("bookId");
    const prefillStudentId = urlParams.get("studentId");
    if (prefillBookId || prefillStudentId) {
      openIssueBookModal(prefillBookId, prefillStudentId);
    }
  }
});

function setupEventListeners() {
  const searchInput = document.getElementById("issue-search-input");
  const statusFilter = document.getElementById("issue-status-filter");

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadIssues();
      }, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      loadIssues();
    });
  }

  const issueForm = document.getElementById("issue-form");
  if (issueForm) {
    issueForm.addEventListener("submit", handleIssueBook);
  }

  const returnForm = document.getElementById("return-form");
  if (returnForm) {
    returnForm.addEventListener("submit", handleReturnBook);
  }

  // Auto-calculate due date when issue date changes
  const issueDateInput = document.getElementById("issue-date");
  if (issueDateInput) {
    issueDateInput.addEventListener("change", () => {
      if (issueDateInput.value) {
        const issueDate = new Date(issueDateInput.value);
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 14);
        document.getElementById("issue-due-date").value = dueDate.toISOString().split("T")[0];
      }
    });
  }
}

async function loadBooksForSelect() {
  try {
    const res = await api.get("/books");
    if (res && res.success && res.data) {
      availableBooks = res.data;
      const select = document.getElementById("issue-book-select");
      if (select) {
        select.innerHTML = `<option value="">Choose a book to issue...</option>` +
          availableBooks.map(b => {
            const disabled = b.availableCopies <= 0 ? "disabled" : "";
            const copyText = b.availableCopies > 0 ? `(${b.availableCopies} available)` : `(Out of stock)`;
            return `<option value="${b.id}" ${disabled}>${escapeHtml(b.title)} - ISBN: ${escapeHtml(b.isbn)} ${copyText}</option>`;
          }).join("");
      }
    }
  } catch (error) {
    console.error("Failed to load books for select:", error);
  }
}

async function loadStudentsForSelect() {
  try {
    const res = await api.get("/students");
    if (res && res.success && res.data) {
      registeredStudents = res.data;
      const select = document.getElementById("issue-student-select");
      if (select) {
        select.innerHTML = `<option value="">Choose registered student...</option>` +
          registeredStudents.map(s => {
            return `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.studentId)}) - ${escapeHtml(s.department)}</option>`;
          }).join("");
      }
    }
  } catch (error) {
    console.error("Failed to load students for select:", error);
  }
}

async function loadIssues() {
  const tbody = document.getElementById("issues-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Loading issue records...</td></tr>`;

  const query = document.getElementById("issue-search-input")?.value || "";
  const status = document.getElementById("issue-status-filter")?.value || "";

  try {
    const res = await api.get("/issues", { query, status });
    if (res && res.success && res.data) {
      allIssues = res.data;
      renderIssuesTable(allIssues);
    }
  } catch (error) {
    console.error("Failed to load issues:", error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load issue records. ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderIssuesTable(issues) {
  const tbody = document.getElementById("issues-table-body");
  const countBadge = document.getElementById("issues-count-badge");
  if (countBadge) countBadge.textContent = `${issues.length} Records`;

  if (issues.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="state-container">
          <i class="bi bi-journal-check"></i>
          <h5>No issue records found</h5>
          <p>No active or historical book issue transactions match the current filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = issues.map(item => {
    let badgeClass = "badge-issued";
    if (item.status === "RETURNED") badgeClass = "badge-returned";
    if (item.status === "OVERDUE") badgeClass = "badge-overdue";

    return `
      <tr>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(item.bookTitle)}</div>
          <small class="text-muted">ISBN: ${escapeHtml(item.bookIsbn)}</small>
        </td>
        <td>
          <div class="fw-medium">${escapeHtml(item.studentName)}</div>
          <small class="text-muted">ID: ${escapeHtml(item.studentIdentifier)}</small>
        </td>
        <td>${item.issueDate || "-"}</td>
        <td>
          <span class="${item.status === 'OVERDUE' ? 'text-danger fw-bold' : ''}">
            ${item.dueDate || "-"}
          </span>
          ${item.overdueDays > 0 && item.status !== 'RETURNED' ? `<br><small class="text-danger fw-semibold">${item.overdueDays} days late</small>` : ''}
        </td>
        <td>${item.returnDate || `<span class="text-muted">-</span>`}</td>
        <td>
          <span class="badge-status ${badgeClass}">
            <i class="bi bi-circle-fill" style="font-size: 6px;"></i>
            ${item.status}
          </span>
          ${item.fineAmount > 0 ? `<br><small class="text-danger fw-semibold">Fine: $${parseFloat(item.fineAmount).toFixed(2)}</small>` : ''}
        </td>
        <td class="text-end">
          <div class="btn-action-group">
            ${item.status !== "RETURNED" ? `
              <button class="btn btn-sm btn-success px-2 py-1" title="Return Book" onclick="openReturnModal(${item.id})">
                <i class="bi bi-arrow-return-left me-1"></i>Return
              </button>
              <button class="btn btn-sm btn-outline-secondary px-2 py-1 ms-1" title="Renew for 14 Days" onclick="renewBook(${item.id})">
                <i class="bi bi-arrow-clockwise me-1"></i>Renew
              </button>
            ` : `
              <span class="badge bg-light text-muted border py-1 px-2"><i class="bi bi-check2-all me-1"></i>Completed</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openIssueBookModal(prefillBookId, prefillStudentId) {
  document.getElementById("issue-form").reset();
  
  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  document.getElementById("issue-date").value = today;
  document.getElementById("issue-due-date").value = dueDate.toISOString().split("T")[0];

  if (prefillBookId) {
    document.getElementById("issue-book-select").value = prefillBookId;
  }
  if (prefillStudentId) {
    document.getElementById("issue-student-select").value = prefillStudentId;
  }

  const modal = new bootstrap.Modal(document.getElementById("issueModal"));
  modal.show();
}

async function handleIssueBook(e) {
  e.preventDefault();

  const payload = {
    bookId: parseInt(document.getElementById("issue-book-select").value),
    studentId: parseInt(document.getElementById("issue-student-select").value),
    issueDate: document.getElementById("issue-date").value,
    dueDate: document.getElementById("issue-due-date").value,
    notes: document.getElementById("issue-notes").value.trim()
  };

  if (!payload.bookId || !payload.studentId || !payload.issueDate || !payload.dueDate) {
    showToast("warning", "Missing Fields", "Please select book, student, issue date, and due date.");
    return;
  }

  try {
    const res = await api.post("/issues", payload);
    if (res && res.success) {
      showToast("success", "Issued", "Book issued successfully to student.");
      
      const modalEl = document.getElementById("issueModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Refresh selects & issues list
      await Promise.all([loadBooksForSelect(), loadStudentsForSelect()]);
      loadIssues();
    }
  } catch (error) {
    showToast("error", "Issue Failed", error.message);
  }
}

function openReturnModal(issueId) {
  const issue = allIssues.find(i => i.id === issueId);
  if (!issue) return;

  document.getElementById("return-issue-id").value = issue.id;
  document.getElementById("return-book-title").textContent = issue.bookTitle;
  document.getElementById("return-student-name").textContent = `${issue.studentName} (${issue.studentIdentifier})`;
  document.getElementById("return-due-date-display").textContent = issue.dueDate;
  
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("return-date-input").value = today;
  document.getElementById("return-notes").value = "";

  // Preview fine
  checkFinePreview(issue.dueDate, today);

  const modal = new bootstrap.Modal(document.getElementById("returnModal"));
  modal.show();
}

function checkFinePreview(dueDateStr, returnDateStr) {
  const alertEl = document.getElementById("return-fine-alert");
  if (!alertEl) return;

  const dueDate = new Date(dueDateStr);
  const returnDate = new Date(returnDateStr);

  if (returnDate > dueDate) {
    const diffTime = Math.abs(returnDate - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const estimatedFine = (diffDays * 1.00).toFixed(2);
    alertEl.style.display = "block";
    alertEl.className = "alert alert-warning py-2 mb-3";
    alertEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> Overdue by <strong>${diffDays} days</strong>. An automatic fine of <strong>$${estimatedFine}</strong> will be assessed.`;
  } else {
    alertEl.style.display = "none";
  }
}

async function handleReturnBook(e) {
  e.preventDefault();

  const issueId = document.getElementById("return-issue-id").value;
  const payload = {
    returnDate: document.getElementById("return-date-input").value,
    notes: document.getElementById("return-notes").value.trim()
  };

  try {
    const res = await api.post(`/issues/${issueId}/return`, payload);
    if (res && res.success) {
      const data = res.data;
      if (data && data.fineAmount > 0) {
        showToast("warning", "Overdue Return", `Book returned with late fine of $${parseFloat(data.fineAmount).toFixed(2)}.`);
      } else {
        showToast("success", "Returned", "Book returned successfully. Inventory updated.");
      }

      const modalEl = document.getElementById("returnModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Refresh selects & issues list
      await Promise.all([loadBooksForSelect(), loadStudentsForSelect()]);
      loadIssues();
    }
  } catch (error) {
    showToast("error", "Return Failed", error.message);
  }
}

async function renewBook(issueId) {
  if (!confirm("Renew this book issue for an additional 14 days?")) return;

  try {
    const res = await api.post(`/issues/${issueId}/renew?days=14`);
    if (res && res.success) {
      showToast("success", "Renewed", `Due date extended to ${res.data.dueDate}.`);
      loadIssues();
    }
  } catch (error) {
    showToast("error", "Renewal Failed", error.message);
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
