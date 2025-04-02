class InventoryManager {
    constructor() {
        this.inventory = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            type: '',
            search: '',
            category: ''
        };
    }

    // Initialize inventory page
    async init() {
        try {
            app.showSpinner();
            this.initEventListeners();
            await this.loadInventory();
            await this.loadCategories();
            this.initFilters();
            this.checkLowStock();
        } catch (error) {
            app.showToast('Failed to initialize inventory', 'error');
            console.error('Inventory initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // New item button
        const newItemBtn = document.getElementById('newItemBtn');
        if (newItemBtn) {
            newItemBtn.addEventListener('click', () => this.showItemModal());
        }

        // Search input
        const searchInput = document.getElementById('searchInventory');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadInventory();
            }, 500));
        }

        // Filter form
        const filterForm = document.getElementById('inventoryFilters');
        if (filterForm) {
            filterForm.addEventListener('change', () => {
                this.updateFilters();
                this.loadInventory();
            });
        }

        // Movement buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.stock-in-btn')) {
                const itemId = e.target.dataset.itemId;
                this.showMovementModal(itemId, 'IN');
            } else if (e.target.matches('.stock-out-btn')) {
                const itemId = e.target.dataset.itemId;
                this.showMovementModal(itemId, 'OUT');
            }
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.loadInventory();
                }
            }
        });
    }

    // Load inventory from API
    async loadInventory() {
        try {
            app.showSpinner();
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 10,
                ...this.filters
            });

            const response = await app.apiRequest(`/inventory?${queryParams}`);
            
            this.inventory = response.data.items;
            this.totalPages = response.data.pagination.pages;
            
            this.renderInventory();
            this.renderPagination();
            this.updateSummary(response.data.summary);
        } catch (error) {
            app.showToast('Failed to load inventory', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Load categories
    async loadCategories() {
        try {
            const response = await app.apiRequest('/inventory/categories');
            const categories = response.data.categories;
            
            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect) {
                categorySelect.innerHTML = `
                    <option value="">All Categories</option>
                    ${categories.map(category => `
                        <option value="${category.CategoryID}">${category.Name}</option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    // Render inventory table
    renderInventory() {
        const tableBody = document.getElementById('inventoryTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.inventory.map(item => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${item.Name}</div>
                            <div class="text-sm text-gray-500">${item.CategoryName}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getStockBadge(item.CurrentStock, item.MinimumStock)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${app.formatCurrency(item.Price)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${item.MinimumStock}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        class="stock-in-btn text-green-600 hover:text-green-900 mr-3"
                        data-item-id="${item.ItemID}">
                        Stock In
                    </button>
                    <button 
                        class="stock-out-btn text-red-600 hover:text-red-900 mr-3"
                        data-item-id="${item.ItemID}">
                        Stock Out
                    </button>
                    <button 
                        onclick="inventoryManager.showItemHistory(${item.ItemID})"
                        class="text-primary-600 hover:text-primary-900">
                        History
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Get stock badge HTML
    getStockBadge(currentStock, minimumStock) {
        let classes, icon;
        if (currentStock === 0) {
            classes = 'bg-red-100 text-red-800';
            icon = 'fa-times-circle';
        } else if (currentStock <= minimumStock) {
            classes = 'bg-yellow-100 text-yellow-800';
            icon = 'fa-exclamation-circle';
        } else {
            classes = 'bg-green-100 text-green-800';
            icon = 'fa-check-circle';
        }

        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}">
                <i class="fas ${icon} mr-1"></i>
                ${currentStock}
            </span>
        `;
    }

    // Show item modal
    async showItemModal(itemId = null) {
        const isEdit = !!itemId;
        let item = null;

        if (isEdit) {
            try {
                app.showSpinner();
                const response = await app.apiRequest(`/inventory/${itemId}`);
                item = response.data.item;
            } catch (error) {
                app.showToast('Failed to load item details', 'error');
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
                            ${isEdit ? 'Edit Item' : 'New Item'}
                        </h3>
                    </div>
                    <form id="itemForm" class="p-6">
                        ${await this.getItemFormFields(item)}
                    </form>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('itemModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="inventoryManager.saveItem(${itemId})"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'itemModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    // Show movement modal
    async showMovementModal(itemId, type) {
        try {
            const response = await app.apiRequest(`/inventory/${itemId}`);
            const item = response.data.item;

            const modalHTML = `
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div class="bg-white rounded-lg max-w-lg w-full">
                        <div class="px-6 py-4 border-b">
                            <h3 class="text-lg font-medium text-gray-900">
                                ${type === 'IN' ? 'Stock In' : 'Stock Out'}: ${item.Name}
                            </h3>
                        </div>
                        <form id="movementForm" class="p-6">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input 
                                        type="number"
                                        name="quantity"
                                        min="1"
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Reference Type</label>
                                    <select 
                                        name="referenceType"
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        required>
                                        <option value="CUSTOMER_ISSUE">Customer Issue</option>
                                        <option value="STAFF_ISSUE">Staff Issue</option>
                                        <option value="PURCHASE">Purchase</option>
                                        <option value="RETURN">Return</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Notes</label>
                                    <textarea 
                                        name="notes"
                                        rows="2"
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"></textarea>
                                </div>
                            </div>
                        </form>
                        <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                            <button 
                                type="button"
                                onclick="document.getElementById('movementModal').remove()"
                                class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onclick="inventoryManager.saveMovement(${itemId}, '${type}')"
                                class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.id = 'movementModal';
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer);
        } catch (error) {
            app.showToast('Failed to load item details', 'error');
        }
    }

    // Save inventory movement
    async saveMovement(itemId, type) {
        try {
            const form = document.getElementById('movementForm');
            const formData = new FormData(form);
            
            const data = {
                itemId,
                type,
                quantity: parseInt(formData.get('quantity')),
                referenceType: formData.get('referenceType'),
                notes: formData.get('notes')
            };

            app.showSpinner();

            await app.apiRequest('/inventory/movement', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            app.showToast('Movement recorded successfully', 'success');
            document.getElementById('movementModal').remove();
            this.loadInventory();
        } catch (error) {
            app.showToast('Failed to record movement', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Check for low stock items
    async checkLowStock() {
        try {
            const response = await app.apiRequest('/inventory/alerts');
            const lowStockItems = response.data.alerts;

            if (lowStockItems.length > 0) {
                app.showToast(`${lowStockItems.length} items are low on stock`, 'warning');
            }
        } catch (error) {
            console.error('Failed to check low stock:', error);
        }
    }

    // Update filters
    updateFilters() {
        const filterForm = document.getElementById('inventoryFilters');
        if (!filterForm) return;

        const formData = new FormData(filterForm);
        this.filters = {
            type: formData.get('type'),
            category: formData.get('category')
        };
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

// Initialize inventory manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const inventoryManager = new InventoryManager();
    inventoryManager.init();

    // Store instance for global access
    window.inventoryManager = inventoryManager;
});