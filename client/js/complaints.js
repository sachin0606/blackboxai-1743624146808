class ComplaintsManager {
    constructor() {
        this.complaints = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            status: '',
            priority: '',
            startDate: '',
            endDate: '',
            search: ''
        };
    }

    // Initialize complaints page
    async init() {
        try {
            app.showSpinner();
            this.initEventListeners();
            await this.loadComplaints();
            this.initFilters();
        } catch (error) {
            app.showToast('Failed to initialize complaints', 'error');
            console.error('Complaints initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // New complaint button
        const newComplaintBtn = document.getElementById('newComplaintBtn');
        if (newComplaintBtn) {
            newComplaintBtn.addEventListener('click', () => this.showComplaintModal());
        }

        // Search input
        const searchInput = document.getElementById('searchComplaints');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadComplaints();
            }, 500));
        }

        // Filter form
        const filterForm = document.getElementById('complaintFilters');
        if (filterForm) {
            filterForm.addEventListener('change', () => {
                this.updateFilters();
                this.loadComplaints();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.loadComplaints();
                }
            }
        });
    }

    // Load complaints from API
    async loadComplaints() {
        try {
            app.showSpinner();
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 10,
                ...this.filters
            });

            const response = await app.apiRequest(`/complaints?${queryParams}`);
            
            this.complaints = response.data.complaints;
            this.totalPages = response.data.pagination.pages;
            
            this.renderComplaints();
            this.renderPagination();
        } catch (error) {
            app.showToast('Failed to load complaints', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Render complaints table
    renderComplaints() {
        const tableBody = document.getElementById('complaintsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.complaints.map(complaint => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-900">#${complaint.ComplaintID}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div>
                            <div class="text-sm font-medium text-gray-900">
                                ${complaint.CustomerName}
                            </div>
                            <div class="text-sm text-gray-500">
                                ${complaint.CardNumber}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${complaint.Description}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getPriorityBadge(complaint.Priority)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getStatusBadge(complaint.Status)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${app.formatDate(complaint.CreatedAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onclick="complaintsManager.showComplaintDetails(${complaint.ComplaintID})"
                        class="text-primary-600 hover:text-primary-900 mr-3">
                        View
                    </button>
                    ${this.getActionButton(complaint)}
                </td>
            </tr>
        `).join('');
    }

    // Get priority badge HTML
    getPriorityBadge(priority) {
        const classes = {
            1: 'bg-green-100 text-green-800',
            2: 'bg-yellow-100 text-yellow-800',
            3: 'bg-red-100 text-red-800'
        };
        const labels = {
            1: 'Low',
            2: 'Medium',
            3: 'High'
        };
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[priority]}">
                ${labels[priority]}
            </span>
        `;
    }

    // Get status badge HTML
    getStatusBadge(status) {
        const classes = {
            'OPEN': 'bg-red-100 text-red-800',
            'ASSIGNED': 'bg-blue-100 text-blue-800',
            'TECHNICIAN_CLOSED': 'bg-yellow-100 text-yellow-800',
            'MANAGER_REVIEWED': 'bg-purple-100 text-purple-800',
            'CLOSED': 'bg-green-100 text-green-800'
        };
        return `
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}">
                ${status.replace('_', ' ')}
            </span>
        `;
    }

    // Get action button based on complaint status and user role
    getActionButton(complaint) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return '';

        switch (user.role) {
            case 'TECHNICIAN':
                if (complaint.Status === 'ASSIGNED' && complaint.AssignedTo === user.id) {
                    return `
                        <button 
                            onclick="complaintsManager.updateComplaintStatus(${complaint.ComplaintID}, 'TECHNICIAN_CLOSED')"
                            class="text-green-600 hover:text-green-900">
                            Mark Resolved
                        </button>
                    `;
                }
                break;
            case 'MANAGER':
            case 'ADMIN':
                if (complaint.Status === 'TECHNICIAN_CLOSED') {
                    return `
                        <button 
                            onclick="complaintsManager.reviewComplaint(${complaint.ComplaintID})"
                            class="text-purple-600 hover:text-purple-900">
                            Review
                        </button>
                    `;
                }
                break;
        }
        return '';
    }

    // Render pagination
    renderPagination() {
        const paginationContainer = document.getElementById('complaintsPagination');
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

    // Show complaint modal
    async showComplaintModal(complaintId = null) {
        const isEdit = !!complaintId;
        let complaint = null;

        if (isEdit) {
            try {
                app.showSpinner();
                const response = await app.apiRequest(`/complaints/${complaintId}`);
                complaint = response.data.complaint;
            } catch (error) {
                app.showToast('Failed to load complaint details', 'error');
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
                            ${isEdit ? 'Edit Complaint' : 'New Complaint'}
                        </h3>
                    </div>
                    <form id="complaintForm" class="p-6">
                        ${this.getComplaintFormFields(complaint)}
                    </form>
                    <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onclick="document.getElementById('complaintModal').remove()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onclick="complaintsManager.saveComplaint(${complaintId})"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'complaintModal';
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    // Get complaint form fields
    getComplaintFormFields(complaint = null) {
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
                    <label class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                        name="description"
                        rows="3"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>${complaint?.Description || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Priority</label>
                    <select 
                        name="priority"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required>
                        <option value="1" ${complaint?.Priority === 1 ? 'selected' : ''}>Low</option>
                        <option value="2" ${complaint?.Priority === 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${complaint?.Priority === 3 ? 'selected' : ''}>High</option>
                    </select>
                </div>
            </div>
        `;
    }

    // Save complaint
    async saveComplaint(complaintId = null) {
        try {
            const form = document.getElementById('complaintForm');
            const formData = new FormData(form);
            
            const data = {
                customerId: parseInt(formData.get('customerId')),
                description: formData.get('description'),
                priority: parseInt(formData.get('priority'))
            };

            app.showSpinner();

            if (complaintId) {
                await app.apiRequest(`/complaints/${complaintId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                app.showToast('Complaint updated successfully', 'success');
            } else {
                await app.apiRequest('/complaints', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                app.showToast('Complaint created successfully', 'success');
            }

            document.getElementById('complaintModal').remove();
            this.loadComplaints();
        } catch (error) {
            app.showToast('Failed to save complaint', 'error');
        } finally {
            app.hideSpinner();
        }
    }

    // Update filters
    updateFilters() {
        const filterForm = document.getElementById('complaintFilters');
        if (!filterForm) return;

        const formData = new FormData(filterForm);
        this.filters = {
            status: formData.get('status'),
            priority: formData.get('priority'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate')
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

// Initialize complaints manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const complaintsManager = new ComplaintsManager();
    complaintsManager.init();

    // Store instance for global access
    window.complaintsManager = complaintsManager;
});