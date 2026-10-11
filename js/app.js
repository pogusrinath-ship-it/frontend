/**
 * CodeRescue — Homepage Application Logic (Search, Filter, Cards)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Render navbar
    Auth.renderNavbar('home');

    // 2. State variables
    let currentKeyword = '';
    let currentLanguage = 'all';

    // 3. Elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const filterPills = document.querySelectorAll('.pill-btn');
    const errorsGrid = document.getElementById('errors-grid');
    const resultsHeading = document.getElementById('results-heading');
    const resultsCount = document.getElementById('results-count');

    // 4. Load & Render Errors
    async function loadErrors() {
        errorsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="text-secondary mt-3">Fetching solutions...</p>
            </div>
        `;

        const errors = await API.getErrors(currentKeyword, currentLanguage);
        renderErrorCards(errors);
    }

    function renderErrorCards(errors) {
        if (!errors || errors.length === 0) {
            resultsCount.textContent = '0 errors found';
            errorsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-search-heart display-1 text-muted"></i>
                    <h4 class="text-white mt-3">No matching errors found</h4>
                    <p class="text-secondary">Try searching for keywords like "null", "pointer", "index", or "types".</p>
                    <a href="submit-error.html" class="btn btn-primary-custom btn-sm mt-2">
                        <i class="bi bi-plus-circle me-1"></i> Submit This Error
                    </a>
                </div>
            `;
            return;
        }

        resultsCount.textContent = `Showing ${errors.length} programming ${errors.length === 1 ? 'error' : 'errors'}`;

        const langBadgeClass = {
            'java': 'badge-java',
            'python': 'badge-python',
            'c': 'badge-c',
            'javascript': 'badge-javascript'
        };

        errorsGrid.innerHTML = errors.map(err => {
            const badgeClass = langBadgeClass[err.language?.toLowerCase()] || 'badge-java';
            const snippet = err.errorMessage ? err.errorMessage.substring(0, 110) + '...' : '';
            const previewCause = err.cause ? (err.cause.length > 130 ? err.cause.substring(0, 130) + '...' : err.cause) : '';

            return `
            <div class="col-md-6 col-lg-4">
                <div class="error-card">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="lang-badge ${badgeClass}">
                                <i class="bi bi-code-slash me-1"></i>${err.language}
                            </span>
                            <div class="text-muted small">
                                <i class="bi bi-hand-thumbs-up text-success me-1"></i>${err.helpfulVotes || 0}
                            </div>
                        </div>

                        <h5 class="fw-bold text-white mb-2 text-truncate" title="${err.title}">
                            ${err.title}
                        </h5>

                        <div class="terminal-box py-2 px-3 my-2 small text-truncate" title="${err.errorMessage}">
                            <i class="bi bi-terminal me-1 text-danger"></i>${snippet}
                        </div>

                        <p class="text-secondary small mb-3">
                            ${previewCause}
                        </p>
                    </div>

                    <div class="pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                        <span class="text-muted small">
                            <i class="bi bi-check2-circle text-success me-1"></i>Step-by-step fix
                        </span>
                        <a href="error-details.html?id=${err.id}" class="btn btn-outline-custom btn-sm py-1 px-3">
                            View Solution <i class="bi bi-arrow-right ms-1"></i>
                        </a>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // 5. Event Listeners
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentKeyword = searchInput.value.trim();
        resultsHeading.textContent = currentKeyword ? `Search results for "${currentKeyword}"` : 'Featured Programming Errors';
        loadErrors();
    });

    // Real-time search with debounce
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentKeyword = searchInput.value.trim();
            resultsHeading.textContent = currentKeyword ? `Search results for "${currentKeyword}"` : 'Featured Programming Errors';
            loadErrors();
        }, 300);
    });

    // Language pills filter
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentLanguage = pill.dataset.lang;
            loadErrors();
        });
    });

    // Initial load
    loadErrors();
});
