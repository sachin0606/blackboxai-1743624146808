class CollectionsManager {
    constructor() {
        this.collections = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            startDate: '',
            endDate: '',
            collectionType: '',
            paymentStatus: '',
            search: ''
        };
    }

    // Initialize collections page
    async init() {
        try {
            app.showSpinner();
            this.initEventListeners();
            await this.loadCollections();
            this.initFilters();
            this.initDatePickers();
        } catch (error) {
            app.showToast('Failed to initialize collections', 'error');
            console.error('Collections initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // New collection button
        const newCollectionBtn = document.getElementById('newCollectionBtn');
        if (newCollectionBtn) {
            newCollectionBtn.addEventListener('click', () => this.showCollectionModal());
        }

        // Search input
        const searchInput = document.getElementById('searchCollections');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadCollections();
            }, 500));
        }

        // Filter form
        const filterForm = document.getElementById('collectionFilters');
        if (filterForm) {
            filterForm.addEventListener('change', () => {
                this.updateFilters();
                this.loadCollections();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.loadCollections();
                }
            }
        });
    }

    // Initialize date pickers
    initDatePickers() {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateFilters();
                this.loadCollections();
            });
        });
    }

    // Load collections from API
    async loadCollections() {
        try {
            app.showSpinner();
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 10,
                ...this.filters
            });

            const response = await app.apiRequest(`/collections?${queryParams}`);
            
            this.collections = response.data.collections;
            this.totalPages = response.data.pagination.pages;
            
            this.renderCollections();
            this.renderPagination();
            this.updateSummary(response.data.summary);
        } catch (error) {
            app.showToast('Failed to load collections', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Render collections table
    renderCollections() {
        const tableBody = document.getElementById('collectionsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.collections.map(collection => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-900">${collection.ReceiptNumber}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div>
                            <div class="text-sm font-medium text-gray-900">
                                ${collection.CustomerName}
                            </div>
                            <div class="text-sm text-gray-500">
                                ${collection.CardNumber}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${app.formatCurrency(collection.Amount)}</div>
                    ${collection.Discount > 0 ? 
                        `<div class="text-xs text-green-600">Discount: ${app.formatCurrency(collection.Discount)}</div>` 
                        : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getPaymentTypeBadge(collection.CollectionType)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getStatusBadge(collection.PaymentStatus)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${app.formatDate(collection.CollectionDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onclick="collectionsManager.showCollectionDetails(${collection.CollectionID})"
                        class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    ${this.getActionButton(collection)}
                </td>
            </tr>
        `).join('');
    }

    // Get payment type badge HTML
    getPaymentTypeBadge(type) {
        const classes = {
            'CASH': 'bg-green-100 text-green-800',
            'ONLINE': 'bg-blue-100 text-blue-800',
            'PAYTM': 'bg-purple-100 text-purple-800'
        };
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[type]}">
                ${type}
            </span>
        `;
    }

    // Get status badge HTML
    getStatusBadge(status) {
        const classes = {
            'PAID': 'bg-green-100 text-green-800',
            'PENDING': 'bg-yellow-100 text-yellow-800'
        };
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}">
                ${status}
            </span>
        `;
    }

    // Get action button based on collection status and user role
    getActionButton(collection) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return '';

        if (['ADMIN', 'MANAGER'].includes(user.role) && collection.PaymentStatus === 'PENDING') {
            return `
                <button 
                    onclick="collectionsManager.updateCollectionStatus(${collection.CollectionID}, 'PAID')"
                    class="text-green-600 hover:text-green-900">
                    Mark Paid
                </button>
            `;
        }
        return '';
    }

    // Show collection modal
    async showCollectionModal(collectionId = null) {
        const isEdit = !!collectionId;
        let collection = null;

        if (isEdit) {
            try {
                app.showSpinner();
                const response = await app.apiRequest(`/collections/${collectionId}`);
                collection = response.data.collection;
            } catch (error) {
                app.showToast('Failed to load collection details', 'error');
                return;
            } finally {
                app.hideSpinner();
            }
        }

        const modalHTML = `
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-lg max-w-lg w-full">
                    <div class="px-6 py-4 border-b">
                        <h3 class="text-lg font-medium text-gray-900">
                            ${isEdit ? 'Edit Collection' : 'New Collection'}
                        </h3>
                    </div>
                    <form id="collectionForm" class="p-6">
                        ${this.getCollectionFormFields(collection)}
                    </form>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('collectionModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="collectionsManager.saveCollection(${collectionId})"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'collectionModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Initialize any form elements that need it
        this.initFormElements();
    }

    // Get collection form fields
    getCollectionFormFields(collection = null) {
        return `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Customer</label>
                    <select 
                        name="customerId" 
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>
                        <option value="">Select Customer</option>
                        <!-- Customer options will be populated dynamically -->
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Amount</label>
                    <input 
                        type="number"
                        name="amount"
                        min="0"
                        step="0.01"
                        value="${collection?.Amount || ''}"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Discount</label>
                    <input 
                        type="number"
                        name="discount"
                        min="0"
                        step="0.01"
                        value="${collection?.Discount || '0'}"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Receipt Number</label>
                    <input 
                        type="text"
                        name="receiptNumber"
                        value="${collection?.ReceiptNumber || ''}"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Collection Type</label>
                    <select 
                        name="collectionType"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>
                        <option value="CASH" ${collection?.CollectionType === 'CASH' ? 'selected' : ''}>Cash</option>
                        <option value="ONLINE" ${collection?.CollectionType === 'ONLINE' ? 'selected' : ''}>Online</option>
                        <option value="PAYTM" ${collection?.CollectionType === 'PAYTM' ? 'selected' : ''}>Paytm</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Months</label>
                    <input 
                        type="text"
                        name="months"
                        value="${collection?.Months || ''}"
                        placeholder="e.g., Jan 2024, Feb 2024"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>
                </div>
            </div>
        `;
    }

    // Initialize form elements
    async initFormElements() {
        // Populate customer dropdown
        const customerSelect = document.querySelector('select[name="customerId"]');
        if (customerSelect) {
            try {
                const response = await app.apiRequest('/customers');
                const customers = response.data.customers;
                
                customerSelect.innerHTML = `
                    <option value="">Select Customer</option>
                    ${customers.map(customer => `
                        <option value="${customer.CustomerID}">
                            ${customer.Name} (${customer.CardNumber})
                        </option>
                    `).join('')}
                `;
            } catch (error) {
                console.error('Failed to load customers:', error);
            }
        }
    }

    // Save collection
    async saveCollection(collectionId = null) {
        try {
            const form = document.getElementById('collectionForm');
            const formData = new FormData(form);
            
            const data = {
                customerId: parseInt(formData.get('customerId')),
                amount: parseFloat(formData.get('amount')),
                discount: parseFloat(formData.get('discount')),
                receiptNumber: formData.get('receiptNumber'),
                collectionType: formData.get('collectionType'),
                months: formData.get('months').split(',').map(m => m.trim()),
                paymentStatus: 'PAID'
            };

            app.showSpinner();

            if (collectionId) {
                await app.apiRequest(`/collections/${collectionId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                app.showToast('Collection updated successfully', 'success');
            } else {
                await app.apiRequest('/collections', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                app.showToast('Collection created successfully', 'success');
            }

            document.getElementById('collectionModal').remove();
            this.loadCollections();
        } catch (error) {
            app.showToast('Failed to save collection', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Update collection status
    async updateCollectionStatus(collectionId, status) {
        try {
            app.showSpinner();
            
            await app.apiRequest(`/collections/${collectionId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ paymentStatus: status })
            });

            app.showToast('Collection status updated successfully', 'success');
            this.loadCollections();
        } catch (error) {
            app.showToast('Failed to update collection status', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Update summary section
    updateSummary(summary) {
        const elements = {
            totalCollections: document.getElementById('totalCollections'),
            todayCollections: document.getElementById('todayCollections'),
            pendingCollections: document.getElementById('pendingCollections')
        };

        if (elements.totalCollections) {
            elements.totalCollections.textContent = app.formatCurrency(summary.totalAmount);
        }
        if (elements.todayCollections) {
            elements.todayCollections.textContent = app.formatCurrency(summary.todayAmount);
        }
        if (elements.pendingCollections) {
            elements.pendingCollections.textContent = app.formatCurrency(summary.pendingAmount);
        }
    }

    // Update filters
    updateFilters() {
        const filterForm = document.getElementById('collectionFilters');
        if (!filterForm) return;

        const formData = new FormData(filterForm);
        this.filters = {
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            collectionType: formData.get('collectionType'),
            paymentStatus: formData.get('paymentStatus')
        };
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('collectionsPagination');
        if (!paginationContainer) return;

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button 
                class="pagination-btn relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${this.currentPage === 1 ? 'disabled opacity-50' : ''}"
                data-page="${this.currentPage - 1}"
                ${this.currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            paginationHTML += `
                <button 
                    class="pagination-btn relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${i === this.currentPage ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'}"
                    data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button 
                class="pagination-btn relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${this.currentPage === this.totalPages ? 'disabled opacity-50' : ''}"
                data-page="${this.currentPage + 1}"
                ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    // Debounce helper
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize collections manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const collectionsManager = new CollectionsManager();
    collectionsManager.init();

    // Store instance for global access
    window.collectionsManager = collectionsManager;
});