/**
 * Library Management System - Book Management Controller
 */

let allCategories = [];
let currentBooks = [];

document.addEventListener("DOMContentLoaded", () => {
  if (auth.isAuthenticated()) {
    loadCategories();
    loadBooks();
    setupEventListeners();
  }
});

function setupEventListeners() {
  const searchInput = document.getElementById("book-search-input");
  const categoryFilter = document.getElementById("book-category-filter");

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadBooks();
      }, 300);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
      loadBooks();
    });
  }

  const bookForm = document.getElementById("book-form");
  if (bookForm) {
    bookForm.addEventListener("submit", handleSaveBook);
  }
}

async function loadCategories() {
  try {
    const res = await api.get("/books/categories");
    if (res && res.success && res.data) {
      allCategories = res.data;
      const filterSelect = document.getElementById("book-category-filter");
      const modalSelect = document.getElementById("book-category");

      if (filterSelect) {
        filterSelect.innerHTML = `<option value="">All Categories</option>` +
          allCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      }

      if (modalSelect) {
        modalSelect.innerHTML = `<option value="">Select or Type Category</option>` +
          allCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("") +
          `<option value="__custom__">+ Add New Category...</option>`;
      }
    }
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

async function loadBooks() {
  const tbody = document.getElementById("books-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Loading book catalog...</td></tr>`;

  const query = document.getElementById("book-search-input")?.value || "";
  const category = document.getElementById("book-category-filter")?.value || "";

  try {
    const res = await api.get("/books", { query, category });
    if (res && res.success && res.data) {
      currentBooks = res.data;
      renderBooksTable(currentBooks);
    }
  } catch (error) {
    console.error("Failed to load books:", error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load books. ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderBooksTable(books) {
  const tbody = document.getElementById("books-table-body");
  const countBadge = document.getElementById("books-count-badge");
  if (countBadge) countBadge.textContent = `${books.length} Books`;

  if (books.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="state-container">
          <i class="bi bi-book"></i>
          <h5>No books found</h5>
          <p>Try adjusting your search query or add a new book to the library inventory.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = books.map(book => {
    const isAvailable = book.availableCopies > 0;
    const availabilityBadge = isAvailable
      ? `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check-circle me-1"></i>${book.availableCopies} / ${book.quantity} Available</span>`
      : `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-x-circle me-1"></i>0 / ${book.quantity} Available</span>`;

    return `
      <tr>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(book.title)}</div>
          <small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(book.location || "Shelf General")}</small>
        </td>
        <td>${escapeHtml(book.author)}</td>
        <td><code>${escapeHtml(book.isbn)}</code></td>
        <td><span class="badge bg-light text-dark border">${escapeHtml(book.category)}</span></td>
        <td>${availabilityBadge}</td>
        <td>${book.publicationYear || "-"}</td>
        <td class="text-end">
          <div class="btn-action-group">
            <button class="btn btn-action btn-action-view" title="View Details" onclick="viewBookDetails(${book.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-action btn-action-edit" title="Edit Book" onclick="openEditBookModal(${book.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-action btn-action-delete" title="Delete Book" onclick="deleteBook(${book.id}, '${escapeHtml(book.title)}')">
              <i class="bi bi-trash"></i>
            </button>
            ${isAvailable ? `
              <button class="btn btn-sm btn-outline-primary ms-1 py-1 px-2" title="Issue this book" onclick="quickIssueBook(${book.id})">
                <i class="bi bi-journal-arrow-up me-1"></i>Issue
              </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddBookModal() {
  document.getElementById("book-modal-title").textContent = "Add New Book";
  document.getElementById("book-form").reset();
  document.getElementById("book-id").value = "";
  document.getElementById("custom-category-group").style.display = "none";
  
  const modal = new bootstrap.Modal(document.getElementById("bookModal"));
  modal.show();
}

function openEditBookModal(id) {
  const book = currentBooks.find(b => b.id === id);
  if (!book) return;

  document.getElementById("book-modal-title").textContent = "Edit Book Details";
  document.getElementById("book-id").value = book.id;
  document.getElementById("book-title").value = book.title;
  document.getElementById("book-author").value = book.author;
  document.getElementById("book-isbn").value = book.isbn;
  
  const catSelect = document.getElementById("book-category");
  catSelect.value = book.category;
  document.getElementById("custom-category-group").style.display = "none";

  document.getElementById("book-publisher").value = book.publisher || "";
  document.getElementById("book-year").value = book.publicationYear || "";
  document.getElementById("book-quantity").value = book.quantity;
  document.getElementById("book-location").value = book.location || "";
  document.getElementById("book-description").value = book.description || "";

  const modal = new bootstrap.Modal(document.getElementById("bookModal"));
  modal.show();
}

async function handleSaveBook(e) {
  e.preventDefault();

  const id = document.getElementById("book-id").value;
  let category = document.getElementById("book-category").value;
  if (category === "__custom__") {
    category = document.getElementById("custom-category-input").value.trim();
  }

  const payload = {
    title: document.getElementById("book-title").value.trim(),
    author: document.getElementById("book-author").value.trim(),
    isbn: document.getElementById("book-isbn").value.trim(),
    category: category,
    publisher: document.getElementById("book-publisher").value.trim(),
    publicationYear: parseInt(document.getElementById("book-year").value) || null,
    quantity: parseInt(document.getElementById("book-quantity").value) || 1,
    location: document.getElementById("book-location").value.trim(),
    description: document.getElementById("book-description").value.trim()
  };

  if (!payload.title || !payload.author || !payload.isbn || !payload.category) {
    showToast("warning", "Missing Fields", "Please complete all required book fields.");
    return;
  }

  try {
    let res;
    if (id) {
      res = await api.put(`/books/${id}`, payload);
      showToast("success", "Updated", "Book details have been updated.");
    } else {
      res = await api.post("/books", payload);
      showToast("success", "Added", "New book added to library inventory.");
    }

    const modalEl = document.getElementById("bookModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    loadCategories();
    loadBooks();
  } catch (error) {
    showToast("error", "Error", error.message);
  }
}

async function deleteBook(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

  try {
    const res = await api.delete(`/books/${id}`);
    if (res && res.success) {
      showToast("success", "Deleted", `"${title}" has been deleted.`);
      loadBooks();
    }
  } catch (error) {
    showToast("error", "Cannot Delete", error.message);
  }
}

function viewBookDetails(id) {
  const book = currentBooks.find(b => b.id === id);
  if (!book) return;

  document.getElementById("detail-title").textContent = book.title;
  document.getElementById("detail-author").textContent = book.author;
  document.getElementById("detail-isbn").textContent = book.isbn;
  document.getElementById("detail-category").textContent = book.category;
  document.getElementById("detail-publisher").textContent = book.publisher || "Not specified";
  document.getElementById("detail-year").textContent = book.publicationYear || "Unknown";
  document.getElementById("detail-quantity").textContent = `${book.quantity} copies`;
  document.getElementById("detail-available").textContent = `${book.availableCopies} copies`;
  document.getElementById("detail-location").textContent = book.location || "Shelf CS-01";
  document.getElementById("detail-description").textContent = book.description || "No synopsis available.";

  const modal = new bootstrap.Modal(document.getElementById("viewBookModal"));
  modal.show();
}

function quickIssueBook(bookId) {
  // Redirect to issues page with bookId query param or open issue flow
  window.location.href = `issues.html?bookId=${bookId}`;
}

function handleCategoryChange(select) {
  const customGroup = document.getElementById("custom-category-group");
  if (select.value === "__custom__") {
    customGroup.style.display = "block";
    document.getElementById("custom-category-input").focus();
  } else {
    customGroup.style.display = "none";
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
