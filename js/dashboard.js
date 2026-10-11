/**
 * Library Management System - Dashboard Controller
 */

let categoryChartInstance = null;
let monthlyChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  if (auth.isAuthenticated()) {
    loadDashboardStats();
    loadCategoryChart();
    loadMonthlyChart();
    loadRecentTransactions();
  }
});

async function loadDashboardStats() {
  try {
    const res = await api.get("/dashboard/stats");
    if (res && res.success && res.data) {
      const stats = res.data;
      document.getElementById("stat-total-books").textContent = stats.totalBooks || 0;
      document.getElementById("stat-available-copies").textContent = `${stats.availableCopies || 0} of ${stats.totalCopies || 0} available`;
      document.getElementById("stat-registered-students").textContent = stats.registeredStudents || 0;
      document.getElementById("stat-issued-books").textContent = stats.currentlyIssued || 0;
      document.getElementById("stat-overdue-books").textContent = stats.overdueBooks || 0;
      
      const pendingFinesEl = document.getElementById("stat-pending-fines");
      if (pendingFinesEl) {
        pendingFinesEl.textContent = `$${parseFloat(stats.pendingFines || 0).toFixed(2)}`;
      }
    }
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    showToast("error", "Error", "Could not load dashboard statistics.");
  }
}

async function loadCategoryChart() {
  const chartCanvas = document.getElementById("categoryChart");
  if (!chartCanvas) return;

  try {
    const res = await api.get("/dashboard/categories");
    if (res && res.success && res.data) {
      const data = res.data;
      const labels = data.map(item => item.category);
      const counts = data.map(item => item.count);

      const backgroundColors = [
        "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd",
        "#059669", "#10b981", "#34d399", "#f59e0b",
        "#ec4899", "#8b5cf6", "#6366f1"
      ];

      if (categoryChartInstance) {
        categoryChartInstance.destroy();
      }

      categoryChartInstance = new Chart(chartCanvas, {
        type: "doughnut",
        data: {
          labels: labels.length > 0 ? labels : ["No data"],
          datasets: [{
            data: counts.length > 0 ? counts : [1],
            backgroundColor: backgroundColors.slice(0, labels.length || 1),
            borderWidth: 2,
            borderColor: "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                font: { size: 12 }
              }
            }
          },
          cutout: "68%"
        }
      });
    }
  } catch (error) {
    console.error("Failed to load category chart:", error);
  }
}

async function loadMonthlyChart() {
  const chartCanvas = document.getElementById("monthlyChart");
  if (!chartCanvas) return;

  try {
    const res = await api.get("/dashboard/monthly-stats");
    if (res && res.success && res.data) {
      const data = res.data;
      const labels = data.map(item => item.month);
      const counts = data.map(item => item.count);

      if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
      }

      monthlyChartInstance = new Chart(chartCanvas, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Books Issued",
            data: counts,
            backgroundColor: "rgba(37, 99, 235, 0.85)",
            borderColor: "#1d4ed8",
            borderRadius: 6,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
              grid: { color: "#f1f5f9" }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("Failed to load monthly chart:", error);
  }
}

async function loadRecentTransactions() {
  const tbody = document.getElementById("recent-transactions-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Loading recent transactions...</td></tr>`;

  try {
    const res = await api.get("/dashboard/recent-transactions");
    if (res && res.success && res.data) {
      const transactions = res.data;
      if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No recent book transactions found.</td></tr>`;
        return;
      }

      tbody.innerHTML = transactions.map(t => {
        let badgeClass = "badge-issued";
        if (t.status === "RETURNED") badgeClass = "badge-returned";
        if (t.status === "OVERDUE") badgeClass = "badge-overdue";

        return `
          <tr>
            <td>
              <div class="fw-semibold text-dark">${escapeHtml(t.bookTitle)}</div>
              <small class="text-muted">ISBN: ${escapeHtml(t.bookIsbn)}</small>
            </td>
            <td>
              <div class="fw-medium">${escapeHtml(t.studentName)}</div>
              <small class="text-muted">${escapeHtml(t.studentIdentifier)}</small>
            </td>
            <td>${t.issueDate || "-"}</td>
            <td>${t.dueDate || "-"}</td>
            <td>
              <span class="badge-status ${badgeClass}">
                <i class="bi bi-circle-fill" style="font-size: 6px;"></i>
                ${t.status}
              </span>
            </td>
            <td class="text-end">
              ${t.status !== "RETURNED" ? `
                <button class="btn btn-sm btn-outline-success py-1 px-2" onclick="quickReturn(${t.id}, '${escapeHtml(t.bookTitle)}')">
                  <i class="bi bi-arrow-return-left me-1"></i> Return
                </button>
              ` : `
                <span class="text-muted small">Completed</span>
              `}
            </td>
          </tr>
        `;
      }).join("");
    }
  } catch (error) {
    console.error("Failed to load recent transactions:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error loading transactions.</td></tr>`;
  }
}

async function quickReturn(issueId, bookTitle) {
  if (!confirm(`Confirm return of "${bookTitle}"?`)) return;

  try {
    const res = await api.post(`/issues/${issueId}/return`, {
      returnDate: new Date().toISOString().split("T")[0],
      notes: "Returned via dashboard"
    });

    if (res && res.success) {
      showToast("success", "Returned", `"${bookTitle}" has been returned.`);
      loadDashboardStats();
      loadRecentTransactions();
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
