class StaffManager {
    constructor() {
        this.staff = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            role: '',
            search: ''
        };
    }

    // Initialize staff page
    async init() {
        try {
            app.showSpinner();
            this.initEventListeners();
            await this.loadStaff();
            this.loadPerformanceMetrics();
        } catch (error) {
            app.showToast('Failed to initialize staff page', 'error');
            console.error('Staff initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // New staff button
        const newStaffBtn = document.getElementById('newStaffBtn');
        if (newStaffBtn) {
            newStaffBtn.addEventListener('click', () => this.showStaffModal());
        }

        // Search input
        const searchInput = document.getElementById('searchStaff');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadStaff();
            }, 500));
        }

        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.filters.role = roleFilter.value;
                this.loadStaff();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.loadStaff();
                }
            }
        });
    }

    // Load staff from API
    async loadStaff() {
        try {
            app.showSpinner();
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 10,
                ...this.filters
            });

            const response = await app.apiRequest(`/staff?${queryParams}`);
            
            this.staff = response.data.staff;
            this.totalPages = response.data.pagination.pages;
            
            this.renderStaff();
            this.renderPagination();
        } catch (error) {
            app.showToast('Failed to load staff', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Load performance metrics
    async loadPerformanceMetrics() {
        try {
            const response = await app.apiRequest('/staff/performance');
            this.updatePerformanceMetrics(response.data.performance);
        } catch (error) {
            console.error('Failed to load performance metrics:', error);
        }
    }

    // Render staff table
    renderStaff() {
        const tableBody = document.getElementById('staffTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.staff.map(member => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0">
                            <img class="h-10 w-10 rounded-full" 
                                src="https://ui-avatars.com/api/?name=${encodeURIComponent(member.Name)}&background=0D9488&color=fff" 
                                alt="${member.Name}">
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${member.Name}</div>
                            <div class="text-sm text-gray-500">${member.Username}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getRoleBadge(member.Role)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${member.Mobile || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${member.ActiveComplaints || 0} active</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${app.formatDate(member.LastLoginAt) || 'Never'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onclick="staffManager.showStaffDetails(${member.StaffID})"
                        class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    <button 
                        onclick="staffManager.showStaffModal(${member.StaffID})"
                        class="text-primary-600 hover:text-primary-900">
                        Edit
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Get role badge HTML
    getRoleBadge(role) {
        const classes = {
            'ADMIN': 'bg-red-100 text-red-800',
            'MANAGER': 'bg-purple-100 text-purple-800',
            'TECHNICIAN': 'bg-blue-100 text-blue-800',
            'OPERATOR': 'bg-green-100 text-green-800'
        };
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[role]}">
                ${role}
            </span>
        `;
    }

    // Show staff modal
    async showStaffModal(staffId = null) {
        const isEdit = !!staffId;
        let staff = null;

        if (isEdit) {
            try {
                app.showSpinner();
                const response = await app.apiRequest(`/staff/${staffId}`);
                staff = response.data.staff;
            } catch (error) {
                app.showToast('Failed to load staff details', 'error');
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
                            ${isEdit ? 'Edit Staff Member' : 'New Staff Member'}
                        </h3>
                    </div>
                    <form id="staffForm" class="p-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Name</label>
                                <input 
                                    type="text"
                                    name="name"
                                    value="${staff?.Name || ''}"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Username</label>
                                <input 
                                    type="text"
                                    name="username"
                                    value="${staff?.Username || ''}"
                                    ${isEdit ? 'disabled' : ''}
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                            </div>
                            ${!isEdit ? `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Password</label>
                                    <input 
                                        type="password"
                                        name="password"
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        required>
                                </div>
                            ` : ''}
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Role</label>
                                <select 
                                    name="role"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    required>
                                    <option value="TECHNICIAN" ${staff?.Role === 'TECHNICIAN' ? 'selected' : ''}>Technician</option>
                                    <option value="OPERATOR" ${staff?.Role === 'OPERATOR' ? 'selected' : ''}>Operator</option>
                                    <option value="MANAGER" ${staff?.Role === 'MANAGER' ? 'selected' : ''}>Manager</option>
                                    <option value="ADMIN" ${staff?.Role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Mobile</label>
                                <input 
                                    type="tel"
                                    name="mobile"
                                    value="${staff?.Mobile || ''}"
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                            </div>
                        </div>
                    </form>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('staffModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="staffManager.saveStaff(${staffId})"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'staffModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    // Show staff details
    async showStaffDetails(staffId) {
        try {
            app.showSpinner();
            const response = await app.apiRequest(`/staff/${staffId}`);
            const { staff, metrics, recentActivity } = response.data;

            const modalHTML = `
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div class="bg-white rounded-lg max-w-4xl w-full">
                        <div class="px-6 py-4 border-b flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">Staff Details</h3>
                            <button 
                                onclick="document.getElementById('staffDetailsModal').remove()"
                                class="text-gray-400 hover:text-gray-500">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-2 gap-6">
                                <!-- Staff Info -->
                                <div>
                                    <h4 class="text-sm font-medium text-gray-500 mb-4">Basic Information</h4>
                                    <dl class="space-y-3">
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Name</dt>
                                            <dd class="text-sm text-gray-900">${staff.Name}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Username</dt>
                                            <dd class="text-sm text-gray-900">${staff.Username}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Role</dt>
                                            <dd class="text-sm text-gray-900">${this.getRoleBadge(staff.Role)}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm font-medium text-gray-500">Mobile</dt>
                                            <dd class="text-sm text-gray-900">${staff.Mobile || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <!-- Performance Metrics -->
                                <div>
                                    <h4 class="text-sm font-medium text-gray-500 mb-4">Performance Metrics</h4>
                                    ${this.getMetricsHTML(metrics, staff.Role)}
                                </div>
                            </div>

                            <!-- Recent Activity -->
                            <div class="mt-8">
                                <h4 class="text-sm font-medium text-gray-500 mb-4">Recent Activity</h4>
                                <div class="space-y-4">
                                    ${recentActivity.map(activity => `
                                        <div class="flex items-start">
                                            <div class="flex-shrink-0">
                                                <div class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <i class="fas fa-history text-gray-500"></i>
                                                </div>
                                            </div>
                                            <div class="ml-3">
                                                <p class="text-sm text-gray-900">${activity.Action}</p>
                                                <p class="text-xs text-gray-500">${app.formatDate(activity.CreatedAt)}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.id = 'staffDetailsModal';
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer);
        } catch (error) {
            app.showToast('Failed to load staff details', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Get metrics HTML based on role
    getMetricsHTML(metrics, role) {
        switch (role) {
            case 'TECHNICIAN':
                return `
                    <dl class="space-y-3">
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Total Complaints</dt>
                            <dd class="text-sm text-gray-900">${metrics.TotalComplaints}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Resolved Complaints</dt>
                            <dd class="text-sm text-gray-900">${metrics.ResolvedComplaints}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Average Resolution Time</dt>
                            <dd class="text-sm text-gray-900">${Math.round(metrics.AvgResolutionTimeMinutes / 60)} hours</dd>
                        </div>
                    </dl>
                `;
            case 'OPERATOR':
                return `
                    <dl class="space-y-3">
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Total Collections</dt>
                            <dd class="text-sm text-gray-900">${metrics.TotalCollections}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Total Amount Collected</dt>
                            <dd class="text-sm text-gray-900">${app.formatCurrency(metrics.TotalCollectionAmount)}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Pending Collections</dt>
                            <dd class="text-sm text-gray-900">${metrics.PendingCollections}</dd>
                        </div>
                    </dl>
                `;
            default:
                return `
                    <dl class="space-y-3">
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Total Activities</dt>
                            <dd class="text-sm text-gray-900">${metrics.TotalActivities}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-gray-500">Active Days</dt>
                            <dd class="text-sm text-gray-900">${metrics.ActiveDays}</dd>
                        </div>
                    </dl>
                `;
        }
    }

    // Save staff
    async saveStaff(staffId = null) {
        try {
            const form = document.getElementById('staffForm');
            const formData = new FormData(form);
            
            const data = {
                name: formData.get('name'),
                username: formData.get('username'),
                role: formData.get('role'),
                mobile: formData.get('mobile')
            };

            if (!staffId) {
                data.password = formData.get('password');
            }

            app.showSpinner();

            if (staffId) {
                await app.apiRequest(`/staff/${staffId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                app.showToast('Staff member updated successfully', 'success');
            } else {
                await app.apiRequest('/staff', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                app.showToast('Staff member created successfully', 'success');
            }

            document.getElementById('staffModal').remove();
            this.loadStaff();
        } catch (error) {
            app.showToast('Failed to save staff member', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Update performance metrics display
    updatePerformanceMetrics(performance) {
        const container = document.getElementById('performanceMetrics');
        if (!container) return;

        container.innerHTML = performance.map(staff => `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex items-center">
                    <img class="h-10 w-10 rounded-full" 
                        src="https://ui-avatars.com/api/?name=${encodeURIComponent(staff.staff.Name)}&background=0D9488&color=fff" 
                        alt="${staff.staff.Name}">
                    <div class="ml-4">
                        <h4 class="text-sm font-medium text-gray-900">${staff.staff.Name}</h4>
                        <p class="text-sm text-gray-500">${staff.staff.Role}</p>
                    </div>
                </div>
                <div class="mt-4">
                    ${this.getMetricsHTML(staff.metrics, staff.staff.Role)}
                </div>
            </div>
        `).join('');
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('staffPagination');
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

// Initialize staff manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const staffManager = new StaffManager();
    staffManager.init();

    // Store instance for global access
    window.staffManager = staffManager;
});