class CustomersManager {
    constructor() {
        this.customers = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            search: '',
            hasOutstanding: false
        };
    }

    // Initialize customers page
    async init() {
        try {
            app.showSpinner();
            this.initEventListeners();
            await this.loadCustomers();
            this.checkLargeOutstandings();
        } catch (error) {
            app.showToast('Failed to initialize customers', 'error');
            console.error('Customers initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // New customer button
        const newCustomerBtn = document.getElementById('newCustomerBtn');
        if (newCustomerBtn) {
            newCustomerBtn.addEventListener('click', () => this.showCustomerModal());
        }

        // Search input
        const searchInput = document.getElementById('searchCustomers');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadCustomers();
            }, 500));
        }

        // Outstanding filter
        const outstandingFilter = document.getElementById('outstandingFilter');
        if (outstandingFilter) {
            outstandingFilter.addEventListener('change', () => {
                this.filters.hasOutstanding = outstandingFilter.checked;
                this.loadCustomers();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.loadCustomers();
                }
            }
        });
    }

    // Load customers from API
    async loadCustomers() {
        try {
            app.showSpinner();
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 10,
                ...this.filters
            });

            const response = await app.apiRequest(`/customers?${queryParams}`);
            
            this.customers = response.data.customers;
            this.totalPages = response.data.pagination.pages;
            
            this.renderCustomers();
            this.renderPagination();
        } catch (error) {
            app.showToast('Failed to load customers', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Render customers table
    renderCustomers() {
        const tableBody = document.getElementById('customersTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.customers.map(customer => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${customer.Name}</div>
                            <div class="text-sm text-gray-500">${customer.CardNumber}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${customer.Mobile || '-'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${customer.Address || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getOutstandingBadge(customer.OutstandingAmount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${app.formatDate(customer.LastCollectionDate) || 'Never'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onclick="customersManager.showCustomerDetails(${customer.CustomerID})"
                        class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    <button 
                        onclick="customersManager.showCustomerModal(${customer.CustomerID})"
                        class="text-primary-600 hover:text-primary-900">
                        Edit
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Get outstanding badge HTML
    getOutstandingBadge(amount) {
        if (!amount || amount <= 0) {
            return '<span class="text-green-600">No Outstanding</span>';
        }

        const classes = amount > 1000 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}">
                ${app.formatCurrency(amount)}
            </span>
        `;
    }

    // Show customer modal
    async showCustomerModal(customerId = null) {
        const isEdit = !!customerId;
        let customer = null;

        if (isEdit) {
            try {
                app.showSpinner();
                const response = await app.apiRequest(`/customers/${customerId}`);
                customer = response.data.customer;
            } catch (error) {
                app.showToast('Failed to load customer details', 'error');
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
                            ${isEdit ? 'Edit Customer' : 'New Customer'}
                        </h3>
                    </div>
                    <form id="customerForm" class="p-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Name</label>
                                <input 
                                    type="text"
                                    name="name"
                                    value="${customer?.Name || ''}"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Card Number</label>
                                <input 
                                    type="text"
                                    name="cardNumber"
                                    value="${customer?.CardNumber || ''}"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Mobile</label>
                                <input 
                                    type="tel"
                                    name="mobile"
                                    value="${customer?.Mobile || ''}"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Address</label>
                                <textarea 
                                    name="address"
                                    rows="2"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">${customer?.Address || ''}</textarea>
                            </div>
                        </div>
                    </form>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('customerModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="customersManager.saveCustomer(${customerId})"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'customerModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    // Show customer details
    async showCustomerDetails(customerId) {
        try {
            app.showSpinner();
            const response = await app.apiRequest(`/customers/${customerId}`);
            const customer = response.data.customer;
            const collections = response.data.collections;
            const complaints = response.data.complaints;

            const modalHTML = `
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div class="bg-white rounded-lg max-w-4xl w-full">
                        <div class="px-6 py-4 border-b flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">Customer Details</h3>
                            <button 
                                onclick="document.getElementById('customerDetailsModal').remove()"
                                class="text-gray-400 hover:text-gray-500">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-2 gap-6">
                                <!-- Customer Info -->
                                <div>
                                    <h4 class="text-sm font-medium text-gray-500 mb-4">Basic Information</h4>
                                    <dl class="space-y-3">
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Name</dt>
                                            <dd class="text-sm text-gray-900">${customer.Name}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Card Number</dt>
                                            <dd class="text-sm text-gray-900">${customer.CardNumber}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Mobile</dt>
                                            <dd class="text-sm text-gray-900">${customer.Mobile || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Address</dt>
                                            <dd class="text-sm text-gray-900">${customer.Address || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <!-- Financial Info -->
                                <div>
                                    <h4 class="text-sm font-medium text-gray-500 mb-4">Financial Information</h4>
                                    <dl class="space-y-3">
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Outstanding Amount</dt>
                                            <dd class="text-sm text-gray-900">${app.formatCurrency(customer.OutstandingAmount || 0)}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Last Collection</dt>
                                            <dd class="text-sm text-gray-900">${app.formatDate(customer.LastCollectionDate) || 'Never'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            <!-- Recent Collections -->
                            <div class="mt-8">
                                <h4 class="text-sm font-medium text-gray-500 mb-4">Recent Collections</h4>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white divide-y divide-gray-200">
                                            ${collections.map(collection => `
                                                <tr>
                                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.formatDate(collection.CollectionDate)}</td>
                                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.formatCurrency(collection.TotalAmount)}</td>
                                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${collection.CollectionType}</td>
                                                    <td class="px-6 py-4 whitespace-nowrap">
                                                        ${this.getPaymentStatusBadge(collection.PaymentStatus)}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Recent Complaints -->
                            <div class="mt-8">
                                <h4 class="text-sm font-medium text-gray-500 mb-4">Recent Complaints</h4>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white divide-y divide-gray-200">
                                            ${complaints.map(complaint => `
                                                <tr>
                                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.formatDate(complaint.CreatedAt)}</td>
                                                    <td class="px-6 py-4 text-sm text-gray-900">${complaint.Description}</td>
                                                    <td class="px-6 py-4 whitespace-nowrap">
                                                        ${this.getComplaintStatusBadge(complaint.Status)}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.id = 'customerDetailsModal';
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer);
        } catch (error) {
            app.showToast('Failed to load customer details', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Get payment status badge HTML
    getPaymentStatusBadge(status) {
        const classes = status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}">
                ${status}
            </span>
        `;
    }

    // Get complaint status badge HTML
    getComplaintStatusBadge(status) {
        const classes = {
            'OPEN': 'bg-red-100 text-red-800',
            'ASSIGNED': 'bg-blue-100 text-blue-800',
            'CLOSED': 'bg-green-100 text-green-800'
        };
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status] || 'bg-gray-100 text-gray-800'}">
                ${status}
            </span>
        `;
    }

    // Save customer
    async saveCustomer(customerId = null) {
        try {
            const form = document.getElementById('customerForm');
            const formData = new FormData(form);
            
            const data = {
                name: formData.get('name'),
                cardNumber: formData.get('cardNumber'),
                mobile: formData.get('mobile'),
                address: formData.get('address')
            };

            app.showSpinner();

            if (customerId) {
                await app.apiRequest(`/customers/${customerId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                app.showToast('Customer updated successfully', 'success');
            } else {
                await app.apiRequest('/customers', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                app.showToast('Customer created successfully', 'success');
            }

            document.getElementById('customerModal').remove();
            this.loadCustomers();
        } catch (error) {
            app.showToast('Failed to save customer', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Check for customers with large outstanding amounts
    async checkLargeOutstandings() {
        try {
            const response = await app.apiRequest('/customers/outstanding/large');
            const customers = response.data.customers;

            if (customers.length > 0) {
                app.showToast(`${customers.length} customers have large outstanding amounts`, 'warning');
            }
        } catch (error) {
            console.error('Failed to check large outstandings:', error);
        }
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('customersPagination');
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

// Initialize customers manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const customersManager = new CustomersManager();
    customersManager.init();

    // Store instance for global access
    window.customersManager = customersManager;
});