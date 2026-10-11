/**
 * Library Management System - Student Management Controller
 */

let currentStudents = [];

document.addEventListener("DOMContentLoaded", () => {
  if (auth.isAuthenticated()) {
    loadStudents();
    setupEventListeners();
  }
});

function setupEventListeners() {
  const searchInput = document.getElementById("student-search-input");
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadStudents();
      }, 300);
    });
  }

  const studentForm = document.getElementById("student-form");
  if (studentForm) {
    studentForm.addEventListener("submit", handleSaveStudent);
  }
}

async function loadStudents() {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Loading students...</td></tr>`;

  const query = document.getElementById("student-search-input")?.value || "";

  try {
    const res = await api.get("/students", { query });
    if (res && res.success && res.data) {
      currentStudents = res.data;
      renderStudentsTable(currentStudents);
    }
  } catch (error) {
    console.error("Failed to load students:", error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load students. ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById("students-table-body");
  const countBadge = document.getElementById("students-count-badge");
  if (countBadge) countBadge.textContent = `${students.length} Students`;

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="state-container">
          <i class="bi bi-people"></i>
          <h5>No students registered</h5>
          <p>Register a student to begin issuing library books and managing member records.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const activeBadge = s.activeIssuesCount > 0
      ? `<span class="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-1">${s.activeIssuesCount} Books Borrowed</span>`
      : `<span class="badge bg-light text-muted border px-2 py-1">0 Borrowed</span>`;

    return `
      <tr>
        <td><code>${escapeHtml(s.studentId)}</code></td>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(s.name)}</div>
          <small class="text-muted"><i class="bi bi-envelope me-1"></i>${escapeHtml(s.email)}</small>
        </td>
        <td>${escapeHtml(s.department)}</td>
        <td>${escapeHtml(s.phone)}</td>
        <td>${s.registrationDate || "-"}</td>
        <td>${activeBadge}</td>
        <td class="text-end">
          <div class="btn-action-group">
            <button class="btn btn-action btn-action-edit" title="Edit Student" onclick="openEditStudentModal(${s.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-action btn-action-delete" title="Delete Student" onclick="deleteStudent(${s.id}, '${escapeHtml(s.name)}')">
              <i class="bi bi-trash"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary ms-1 py-1 px-2" title="Issue book to this student" onclick="quickIssueToStudent(${s.id})">
              <i class="bi bi-journal-arrow-up me-1"></i>Issue Book
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddStudentModal() {
  document.getElementById("student-modal-title").textContent = "Register New Student";
  document.getElementById("student-form").reset();
  document.getElementById("student-id-field").value = "";
  document.getElementById("student-reg-date").value = new Date().toISOString().split("T")[0];

  const modal = new bootstrap.Modal(document.getElementById("studentModal"));
  modal.show();
}

function openEditStudentModal(id) {
  const student = currentStudents.find(s => s.id === id);
  if (!student) return;

  document.getElementById("student-modal-title").textContent = "Edit Student Profile";
  document.getElementById("student-id-field").value = student.id;
  document.getElementById("student-identifier").value = student.studentId;
  document.getElementById("student-name").value = student.name;
  document.getElementById("student-email").value = student.email;
  document.getElementById("student-phone").value = student.phone;
  document.getElementById("student-department").value = student.department;
  document.getElementById("student-reg-date").value = student.registrationDate || "";

  const modal = new bootstrap.Modal(document.getElementById("studentModal"));
  modal.show();
}

async function handleSaveStudent(e) {
  e.preventDefault();

  const id = document.getElementById("student-id-field").value;
  const payload = {
    studentId: document.getElementById("student-identifier").value.trim(),
    name: document.getElementById("student-name").value.trim(),
    email: document.getElementById("student-email").value.trim(),
    phone: document.getElementById("student-phone").value.trim(),
    department: document.getElementById("student-department").value.trim(),
    registrationDate: document.getElementById("student-reg-date").value || new Date().toISOString().split("T")[0]
  };

  if (!payload.studentId || !payload.name || !payload.email || !payload.phone || !payload.department) {
    showToast("warning", "Missing Fields", "Please complete all required student fields.");
    return;
  }

  try {
    if (id) {
      await api.put(`/students/${id}`, payload);
      showToast("success", "Updated", "Student profile has been updated.");
    } else {
      await api.post("/students", payload);
      showToast("success", "Registered", "Student registered successfully.");
    }

    const modalEl = document.getElementById("studentModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    loadStudents();
  } catch (error) {
    showToast("error", "Error", error.message);
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to delete student "${name}"? This cannot be undone.`)) return;

  try {
    const res = await api.delete(`/students/${id}`);
    if (res && res.success) {
      showToast("success", "Deleted", `Student "${name}" has been removed.`);
      loadStudents();
    }
  } catch (error) {
    showToast("error", "Cannot Delete", error.message);
  }
}

function quickIssueToStudent(studentId) {
  window.location.href = `issues.html?studentId=${studentId}`;
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
