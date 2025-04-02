// Dashboard Data Management
class DashboardManager {
    constructor() {
        this.dashboardData = null;
        this.charts = {};
        this.refreshInterval = null;
    }

    // Initialize dashboard
    async init() {
        try {
            app.showSpinner();
            await this.loadDashboardData();
            this.initCharts();
            this.initEventListeners();
            this.startAutoRefresh();
        } catch (error) {
            app.showToast('Failed to load dashboard data', 'error');
            console.error('Dashboard initialization error:', error);
        } finally {
            app.hideSpinner();
        }
    }

    // Load dashboard data from API
    async loadDashboardData() {
        try {
            const response = await app.apiRequest('/dashboard');
            this.dashboardData = response.data;
            this.updateDashboardUI();
        } catch (error) {
            throw new Error('Failed to load dashboard data');
        }
    }

    // Update dashboard UI elements
    updateDashboardUI() {
        // Update statistics cards
        this.updateStatCard('totalCustomers', this.dashboardData.customers || 0);
        this.updateStatCard('activeComplaints', this.dashboardData.complaints?.active || 0);
        this.updateStatCard('todayCollection', this.dashboardData.collections?.today || 0);
        this.updateStatCard('lowStockItems', this.dashboardData.inventory?.lowStock || 0);

        // Update recent activities
        this.updateRecentActivities();

        // Update charts
        this.updateCharts();
    }

    // Update individual statistic card
    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (!element) return;

        if (id === 'todayCollection') {
            element.textContent = app.formatCurrency(value);
        } else {
            element.textContent = value.toLocaleString();
        }
    }

    // Initialize charts
    initCharts() {
        // Collection Trend Chart
        this.charts.collectionTrend = new Chart(
            document.getElementById('collectionTrendChart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Collections',
                        data: [],
                        borderColor: '#0ea5e9',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: value => app.formatCurrency(value)
                            }
                        }
                    }
                }
            }
        );

        // Complaint Status Chart
        this.charts.complaintStatus = new Chart(
            document.getElementById('complaintStatusChart'),
            {
                type: 'doughnut',
                data: {
                    labels: ['Open', 'In Progress', 'Resolved'],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            }
        );
    }

    // Update charts with new data
    updateCharts() {
        if (!this.dashboardData) return;

        // Update Collection Trend Chart
        const collectionTrend = this.dashboardData.collections?.trend || [];
        this.charts.collectionTrend.data.labels = collectionTrend.map(item => 
            new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        );
        this.charts.collectionTrend.data.datasets[0].data = collectionTrend.map(item => 
            item.amount
        );
        this.charts.collectionTrend.update();

        // Update Complaint Status Chart
        const complaintStats = this.dashboardData.complaints || {};
        this.charts.complaintStatus.data.datasets[0].data = [
            complaintStats.open || 0,
            complaintStats.inProgress || 0,
            complaintStats.resolved || 0
        ];
        this.charts.complaintStatus.update();
    }

    // Update recent activities section
    updateRecentActivities() {
        const activitiesContainer = document.getElementById('recentActivities');
        if (!activitiesContainer || !this.dashboardData.recentActivities) return;

        const activities = this.dashboardData.recentActivities.slice(0, 5);
        
        activitiesContainer.innerHTML = activities.map(activity => `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full ${this.getActivityIconClass(activity.type)} flex items-center justify-center mr-4">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-800">${activity.description}</p>
                    <p class="text-xs text-gray-500">${app.formatDate(activity.timestamp)}</p>
                </div>
            </div>
        `).join('');
    }

    // Get activity icon class based on type
    getActivityIconClass(type) {
        const classes = {
            'customer': 'bg-blue-100 text-blue-500',
            'complaint': 'bg-red-100 text-red-500',
            'collection': 'bg-green-100 text-green-500',
            'inventory': 'bg-yellow-100 text-yellow-500'
        };
        return classes[type] || 'bg-gray-100 text-gray-500';
    }

    // Get activity icon based on type
    getActivityIcon(type) {
        const icons = {
            'customer': 'fa-user',
            'complaint': 'fa-exclamation-circle',
            'collection': 'fa-money-bill-wave',
            'inventory': 'fa-box'
        };
        return icons[type] || 'fa-info-circle';
    }

    // Initialize event listeners
    initEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // Date range selector
        const dateRange = document.getElementById('dateRange');
        if (dateRange) {
            dateRange.addEventListener('change', () => this.loadDashboardData());
        }
    }

    // Start auto-refresh
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000); // Refresh every 5 minutes
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Clean up
    destroy() {
        this.stopAutoRefresh();
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new DashboardManager();
    dashboard.init();

    // Store dashboard instance for potential future use
    window.dashboard = dashboard;

    // Clean up when leaving the page
    window.addEventListener('unload', () => {
        dashboard.destroy();
    });
});