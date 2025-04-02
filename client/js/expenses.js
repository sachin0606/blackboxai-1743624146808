class ExpensesManager {
    constructor() {
        this.expenses = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            startDate: '',
            endDate: '',
            category: '',
            search: ''
        };
    }

    // Initialize expenses page
    async init() {
        try {
            app.showSpinner();
            this.initEventListeners();
            await this.loadExpenses();
            await this.loadCategories();
            this.initDatePickers();
            this.updateStats();
        } catch (error) {
            app.showToast('Failed to initialize expenses', 'error');
            console.error('Expenses initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // New expense button
        const newExpenseBtn = document.getElementById('newExpenseBtn');
        if (newExpenseBtn) {
            newExpenseBtn.addEventListener('click', () => this.showExpenseModal());
        }

        // Bulk expense button
        const bulkExpenseBtn = document.getElementById('bulkExpenseBtn');
        if (bulkExpenseBtn) {
            bulkExpenseBtn.addEventListener('click', () => this.showBulkExpenseModal());
        }

        // Search input
        const searchInput = document.getElementById('searchExpenses');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadExpenses();
            }, 500));
        }

        // Filter form
        const filterForm = document.getElementById('expenseFilters');
        if (filterForm) {
            filterForm.addEventListener('change', () => {
                this.updateFilters();
                this.loadExpenses();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.loadExpenses();
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
                this.loadExpenses();
            });
        });
    }

    // Load expenses from API
    async loadExpenses() {
        try {
            app.showSpinner();
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 10,
                ...this.filters
            });

            const response = await app.apiRequest(`/expenses?${queryParams}`);
            
            this.expenses = response.data.expenses;
            this.totalPages = response.data.pagination.pages;
            
            this.renderExpenses();
            this.renderPagination();
            this.updateCategorySummary(response.data.categorySummary);
        } catch (error) {
            app.showToast('Failed to load expenses', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Load expense categories
    async loadCategories() {
        try {
            const response = await app.apiRequest('/expenses/categories');
            const categories = response.data.categories;
            
            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect) {
                categorySelect.innerHTML = `
                    <option value="">All Categories</option>
                    ${categories.map(category => `
                        <option value="${category}">${category}</option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    // Render expenses table
    renderExpenses() {
        const tableBody = document.getElementById('expensesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.expenses.map(expense => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${expense.Category}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${expense.Description}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${app.formatCurrency(expense.Amount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${app.formatDate(expense.ExpenseDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${expense.CreatedByName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onclick="expensesManager.showExpenseDetails(${expense.ExpenseID})"
                        class="text-primary-600 hover:text-primary-900">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Show expense modal
    async showExpenseModal(expenseId = null) {
        const isEdit = !!expenseId;
        let expense = null;

        if (isEdit) {
            try {
                app.showSpinner();
                const response = await app.apiRequest(`/expenses/${expenseId}`);
                expense = response.data.expense;
            } catch (error) {
                app.showToast('Failed to load expense details', 'error');
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
                            ${isEdit ? 'Edit Expense' : 'New Expense'}
                        </h3>
                    </div>
                    <form id="expenseForm" class="p-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Category</label>
                                <select 
                                    name="category"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                                    <option value="">Select Category</option>
                                    <!-- Categories will be populated dynamically -->
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Amount</label>
                                <input 
                                    type="number"
                                    name="amount"
                                    min="0"
                                    step="0.01"
                                    value="${expense?.Amount || ''}"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Description</label>
                                <textarea 
                                    name="description"
                                    rows="2"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>${expense?.Description || ''}</textarea>
                            </div>
                        </div>
                    </form>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('expenseModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="expensesManager.saveExpense(${expenseId})"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'expenseModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Populate category dropdown
        await this.loadCategories();
        const categorySelect = modalContainer.querySelector('select[name="category"]');
        if (categorySelect && expense) {
            categorySelect.value = expense.Category;
        }
    }

    // Show bulk expense modal
    showBulkExpenseModal() {
        const modalHTML = `
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-lg max-w-lg w-full">
                    <div class="px-6 py-4 border-b">
                        <h3 class="text-lg font-medium text-gray-900">Bulk Expense Entry</h3>
                    </div>
                    <div class="p-6">
                        <div id="bulkExpenseEntries" class="space-y-4">
                            ${this.getBulkExpenseEntryHTML()}
                        </div>
                        <button 
                            type="button"
                            onclick="expensesManager.addBulkExpenseEntry()"
                            class="mt-4 text-sm text-primary-600 hover:text-primary-900">
                            + Add Another Entry
                        </button>
                    </div>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('bulkExpenseModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="expensesManager.saveBulkExpenses()"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            Save All
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'bulkExpenseModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    // Get bulk expense entry HTML
    getBulkExpenseEntryHTML() {
        return `
            <div class="bulk-expense-entry border rounded-md p-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Category</label>
                        <select 
                            name="category"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required>
                            <option value="">Select Category</option>
                            <!-- Categories will be populated dynamically -->
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Amount</label>
                        <input 
                            type="number"
                            name="amount"
                            min="0"
                            step="0.01"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required>
                    </div>
                </div>
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                        name="description"
                        rows="2"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required></textarea>
                </div>
            </div>
        `;
    }

    // Add bulk expense entry
    addBulkExpenseEntry() {
        const container = document.getElementById('bulkExpenseEntries');
        if (container) {
            const entryDiv = document.createElement('div');
            entryDiv.innerHTML = this.getBulkExpenseEntryHTML();
            container.appendChild(entryDiv.firstElementChild);
        }
    }

    // Save bulk expenses
    async saveBulkExpenses() {
        try {
            const entries = document.querySelectorAll('.bulk-expense-entry');
            const expenses = Array.from(entries).map(entry => ({
                category: entry.querySelector('select[name="category"]').value,
                amount: parseFloat(entry.querySelector('input[name="amount"]').value),
                description: entry.querySelector('textarea[name="description"]').value
            }));

            // Validate entries
            const invalidEntries = expenses.filter(expense => 
                !expense.category || !expense.amount || !expense.description
            );

            if (invalidEntries.length > 0) {
                app.showToast('Please fill in all required fields', 'error');
                return;
            }

            app.showSpinner();

            await app.apiRequest('/expenses/bulk', {
                method: 'POST',
                body: JSON.stringify({ expenses })
            });

            app.showToast('Expenses saved successfully', 'success');
            document.getElementById('bulkExpenseModal').remove();
            this.loadExpenses();
        } catch (error) {
            app.showToast('Failed to save expenses', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Save single expense
    async saveExpense(expenseId = null) {
        try {
            const form = document.getElementById('expenseForm');
            const formData = new FormData(form);
            
            const data = {
                category: formData.get('category'),
                amount: parseFloat(formData.get('amount')),
                description: formData.get('description')
            };

            app.showSpinner();

            if (expenseId) {
                await app.apiRequest(`/expenses/${expenseId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                app.showToast('Expense updated successfully', 'success');
            } else {
                await app.apiRequest('/expenses', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                app.showToast('Expense created successfully', 'success');
            }

            document.getElementById('expenseModal').remove();
            this.loadExpenses();
        } catch (error) {
            app.showToast('Failed to save expense', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Update expense statistics
    async updateStats() {
        try {
            const response = await app.apiRequest('/expenses/stats');
            const stats = response.data;

            const elements = {
                todayExpenses: document.getElementById('todayExpenses'),
                weeklyExpenses: document.getElementById('weeklyExpenses'),
                monthlyExpenses: document.getElementById('monthlyExpenses')
            };

            if (elements.todayExpenses) {
                elements.todayExpenses.textContent = app.formatCurrency(stats.todayExpenses);
            }
            if (elements.weeklyExpenses) {
                elements.weeklyExpenses.textContent = app.formatCurrency(stats.weeklyExpenses);
            }
            if (elements.monthlyExpenses) {
                elements.monthlyExpenses.textContent = app.formatCurrency(stats.monthlyExpenses);
            }
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    // Update category summary
    updateCategorySummary(summary) {
        const container = document.getElementById('categorySummary');
        if (!container) return;

        container.innerHTML = summary.map(category => `
            <div class="bg-white rounded-lg shadow p-4">
                <h4 class="text-sm font-medium text-gray-500">${category.Category}</h4>
                <p class="mt-2 text-2xl font-semibold text-gray-900">${app.formatCurrency(category.TotalAmount)}</p>
                <p class="text-sm text-gray-500">${category.Count} transactions</p>
            </div>
        `).join('');
    }

    // Update filters
    updateFilters() {
        const filterForm = document.getElementById('expenseFilters');
        if (!filterForm) return;

        const formData = new FormData(filterForm);
        this.filters = {
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            category: formData.get('category')
        };
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('expensesPagination');
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

// Initialize expenses manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const expensesManager = new ExpensesManager();
    expensesManager.init();

    // Store instance for global access
    window.expensesManager = expensesManager;
});