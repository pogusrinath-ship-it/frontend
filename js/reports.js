/**
 * Library Management System - Reports & Analytics Controller
 */

let currentReportData = [];

document.addEventListener("DOMContentLoaded", () => {
  if (auth.isAuthenticated()) {
    loadSummaryStats();
    loadReportTab("issues");
    setupEventListeners();
  }
});

function setupEventListeners() {
  const tabs = document.querySelectorAll("#report-tabs button");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const reportType = tab.getAttribute("data-report");
      loadReportTab(reportType);
    });
  });

  const exportBtn = document.getElementById("btn-export-csv");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportCurrentReportToCSV);
  }

  const printBtn = document.getElementById("btn-print-report");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

async function loadSummaryStats() {
  try {
    const res = await api.get("/dashboard/stats");
    if (res && res.success && res.data) {
      const stats = res.data;
      document.getElementById("rep-total-books").textContent = stats.totalBooks || 0;
      document.getElementById("rep-available-copies").textContent = stats.availableCopies || 0;
      document.getElementById("rep-registered-students").textContent = stats.registeredStudents || 0;
      document.getElementById("rep-currently-issued").textContent = stats.currentlyIssued || 0;
      document.getElementById("rep-overdue-books").textContent = stats.overdueBooks || 0;
      document.getElementById("rep-collected-fines").textContent = `$${parseFloat(stats.collectedFines || 0).toFixed(2)}`;
    }
  } catch (error) {
    console.error("Failed to load summary stats:", error);
  }
}

async function loadReportTab(type) {
  const titleEl = document.getElementById("report-table-title");
  const theadEl = document.getElementById("report-table-head");
  const tbodyEl = document.getElementById("report-table-body");
  if (!tbodyEl) return;

  tbodyEl.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Generating report...</td></tr>`;

  try {
    if (type === "issues") {
      titleEl.textContent = "Book Issue & Return History";
      theadEl.innerHTML = `
        <tr>
          <th>Book Title</th>
          <th>ISBN</th>
          <th>Student</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Return Date</th>
          <th>Status</th>
        </tr>
      `;

      const res = await api.get("/reports/issues");
      currentReportData = (res && res.success) ? res.data : [];

      if (currentReportData.length === 0) {
        tbodyEl.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No records found.</td></tr>`;
        return;
      }

      tbodyEl.innerHTML = currentReportData.map(item => `
        <tr>
          <td class="fw-medium">${escapeHtml(item.bookTitle)}</td>
          <td><code>${escapeHtml(item.bookIsbn)}</code></td>
          <td>${escapeHtml(item.studentName)} (${escapeHtml(item.studentIdentifier)})</td>
          <td>${item.issueDate || "-"}</td>
          <td>${item.dueDate || "-"}</td>
          <td>${item.returnDate || "-"}</td>
          <td><span class="badge bg-light text-dark border">${item.status}</span></td>
        </tr>
      `).join("");

    } else if (type === "inventory") {
      titleEl.textContent = "Book Inventory & Availability Report";
      theadEl.innerHTML = `
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>ISBN</th>
          <th>Category</th>
          <th>Total Quantity</th>
          <th>Available Copies</th>
          <th>Shelf Location</th>
        </tr>
      `;

      const res = await api.get("/reports/inventory");
      currentReportData = (res && res.success) ? res.data : [];

      if (currentReportData.length === 0) {
        tbodyEl.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No books found.</td></tr>`;
        return;
      }

      tbodyEl.innerHTML = currentReportData.map(item => `
        <tr>
          <td class="fw-medium">${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.author)}</td>
          <td><code>${escapeHtml(item.isbn)}</code></td>
          <td>${escapeHtml(item.category)}</td>
          <td>${item.quantity}</td>
          <td class="fw-bold ${item.availableCopies > 0 ? 'text-success' : 'text-danger'}">${item.availableCopies}</td>
          <td>${escapeHtml(item.location || "-")}</td>
        </tr>
      `).join("");

    } else if (type === "overdue") {
      titleEl.textContent = "Overdue Books & Penalty Report";
      theadEl.innerHTML = `
        <tr>
          <th>Book Title</th>
          <th>Student Name</th>
          <th>Student ID</th>
          <th>Due Date</th>
          <th>Days Overdue</th>
          <th>Penalty Amount</th>
          <th>Status</th>
        </tr>
      `;

      const res = await api.get("/reports/overdue");
      currentReportData = (res && res.success) ? res.data : [];

      if (currentReportData.length === 0) {
        tbodyEl.innerHTML = `<tr><td colspan="7" class="text-center text-success py-4"><i class="bi bi-check-circle me-1"></i> No books currently overdue!</td></tr>`;
        return;
      }

      tbodyEl.innerHTML = currentReportData.map(item => `
        <tr>
          <td class="fw-medium">${escapeHtml(item.bookTitle)}</td>
          <td>${escapeHtml(item.studentName)}</td>
          <td><code>${escapeHtml(item.studentIdentifier)}</code></td>
          <td class="text-danger fw-semibold">${item.dueDate}</td>
          <td><span class="badge bg-danger">${item.overdueDays} Days</span></td>
          <td class="fw-bold text-danger">$${parseFloat(item.fineAmount || 0).toFixed(2)}</td>
          <td><span class="badge bg-danger-subtle text-danger border border-danger-subtle">${item.status}</span></td>
        </tr>
      `).join("");

    } else if (type === "fines") {
      titleEl.textContent = "Fine Collection & Settlement Report";
      theadEl.innerHTML = `
        <tr>
          <th>Fine ID</th>
          <th>Student</th>
          <th>Book Title</th>
          <th>Overdue Days</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Receipt Reference</th>
        </tr>
      `;

      const res = await api.get("/reports/fines");
      currentReportData = (res && res.success) ? res.data : [];

      if (currentReportData.length === 0) {
        tbodyEl.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No fine records found.</td></tr>`;
        return;
      }

      tbodyEl.innerHTML = currentReportData.map(item => `
        <tr>
          <td><code>#FN-${item.id}</code></td>
          <td>${escapeHtml(item.studentName)} (${escapeHtml(item.studentIdentifier)})</td>
          <td>${escapeHtml(item.bookTitle)}</td>
          <td>${item.overdueDays} Days</td>
          <td class="fw-bold">$${parseFloat(item.amount).toFixed(2)}</td>
          <td><span class="badge bg-light text-dark border">${item.status}</span></td>
          <td><code>${escapeHtml(item.paymentReference || "-")}</code></td>
        </tr>
      `).join("");
    }
  } catch (error) {
    console.error("Failed to load report:", error);
    tbodyEl.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error loading report data.</td></tr>`;
  }
}

function exportCurrentReportToCSV() {
  if (!currentReportData || currentReportData.length === 0) {
    showToast("warning", "Export Empty", "No data available in current report view to export.");
    return;
  }

  const headers = Object.keys(currentReportData[0]);
  const rows = currentReportData.map(row => {
    return headers.map(fieldName => {
      let val = row[fieldName] !== null && row[fieldName] !== undefined ? String(row[fieldName]) : "";
      val = val.replace(/"/g, '""');
      return `"${val}"`;
    }).join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Library_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("success", "Exported", "Report CSV file downloaded successfully.");
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
