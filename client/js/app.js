// API Base URL
const API_BASE_URL = '/api';

// Authentication Token Management
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
                window.location.href = '/login.html';
                return;
            }
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Toast Notification System
const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 flex items-center z-50 animate-fade-in`;
    
    let icon, bgColor;
    switch (type) {
        case 'success':
            icon = 'check-circle';
            bgColor = 'bg-green-50';
            break;
        case 'error':
            icon = 'exclamation-circle';
            bgColor = 'bg-red-50';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            bgColor = 'bg-yellow-50';
            break;
        default:
            icon = 'info-circle';
            bgColor = 'bg-blue-50';
    }

    toast.innerHTML = `
        <div class="flex items-center ${bgColor} p-4 rounded-lg">
            <i class="fas fa-${icon} text-${type === 'info' ? 'blue' : type}-500 mr-3"></i>
            <p class="text-sm text-gray-800">${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
};

// Loading Spinner
const showSpinner = () => {
    const spinner = document.createElement('div');
    spinner.id = 'globalSpinner';
    spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    spinner.innerHTML = `
        <div class="bg-white p-4 rounded-lg flex items-center">
            <div class="loading-spinner mr-3"></div>
            <p class="text-gray-800">Loading...</p>
        </div>
    `;
    document.body.appendChild(spinner);
};

const hideSpinner = () => {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) spinner.remove();
};

// Form Validation Helper
const validateForm = (formData, rules) => {
    const errors = {};

    for (const [field, value] of formData.entries()) {
        if (rules[field]) {
            const fieldRules = rules[field];

            if (fieldRules.required && !value) {
                errors[field] = `${field} is required`;
            }

            if (fieldRules.minLength && value.length < fieldRules.minLength) {
                errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
            }

            if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
                errors[field] = `${field} format is invalid`;
            }

            if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`;
            }

            if (fieldRules.min && Number(value) < fieldRules.min) {
                errors[field] = `${field} must be at least ${fieldRules.min}`;
            }

            if (fieldRules.max && Number(value) > fieldRules.max) {
                errors[field] = `${field} must not exceed ${fieldRules.max}`;
            }
        }
    }

    return errors;
};

// Date Formatter
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Currency Formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

// Authentication Check
const checkAuth = () => {
    const token = getToken();
    if (!token && window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
        return false;
    }
    return true;
};

// User Role Check
const checkRole = (allowedRoles) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !allowedRoles.includes(user.role)) {
        window.location.href = '/unauthorized.html';
        return false;
    }
    return true;
};

// Sidebar Navigation
const initSidebar = () => {
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('bg-gray-100');
        }
        
        link.addEventListener('click', (e) => {
            sidebarLinks.forEach(l => l.classList.remove('bg-gray-100'));
            link.classList.add('bg-gray-100');
        });
    });
};

// Data Table Helper
const initDataTable = (tableId, options = {}) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const {
        sortable = true,
        searchable = true,
        pagination = true,
        rowsPerPage = 10
    } = options;

    // Implementation for sorting, searching, and pagination
    // This would be expanded based on specific needs
};

// Export functions and constants
window.app = {
    apiRequest,
    showToast,
    showSpinner,
    hideSpinner,
    validateForm,
    formatDate,
    formatCurrency,
    checkAuth,
    checkRole,
    initSidebar,
    initDataTable
};

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname !== '/login.html') {
        checkAuth();
        initSidebar();
    }
});