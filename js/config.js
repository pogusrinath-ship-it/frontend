/**
 * Library Management System - Frontend Configuration
 */
const CONFIG = {
  // Spring Boot REST API Base URL
  API_BASE_URL: (function() {
    // If frontend is served directly by Spring Boot or a reverse proxy:
    if (window.location.port === "8080") {
      return `${window.location.origin}/api`;
    }
    // Default development server location
    return "http://localhost:8080/api";
  })(),
  
  DEFAULT_BORROW_DAYS: 14,
  DEFAULT_DAILY_FINE: 1.00,
  APP_NAME: "Library Management System"
};

// Freeze config object to prevent accidental mutation
Object.freeze(CONFIG);
