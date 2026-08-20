import React, { useState, useEffect } from 'react';
import { listNotifications, getNotification } from '../../api/notifications.api';
import { NotificationTable } from '../../features/notifications/NotificationTable';
import { NotificationFilters } from '../../features/notifications/NotificationFilters';
import { NotificationDetailsModal } from '../../features/notifications/NotificationDetailsModal';
import { Bell, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const Notifications = ({ activeProjectId }) => {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', channel: '', recipient: '', page: 1 });

  // Modal State
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await listNotifications(activeProjectId, {
        page: filters.page,
        limit: 20,
        status: filters.status || undefined,
        channel: filters.channel || undefined,
        recipient: filters.recipient || undefined,
      });

      if (res.success && res.data) {
        setNotifications(res.data.items || res.data.notifications || []);
        setPagination(
          res.data.pagination || {
            page: res.data.page || 1,
            limit: res.data.limit || 20,
            totalPages: res.data.totalPages || 1,
            total: res.data.totalCount || 0,
          }
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch notification history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeProjectId, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({ status: '', channel: '', recipient: '', page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await getNotification(activeProjectId, id);
      if (res.success && res.data) {
        setSelectedNotification(res.data.notification);
        setIsModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load notification details');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notification History & Observability
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time delivery logs, attempt tracking, and historical content snapshots.
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <NotificationFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Paginated Notification Table */}
      <NotificationTable
        notifications={notifications}
        pagination={pagination}
        loading={loading}
        onPageChange={handlePageChange}
        onViewDetails={handleViewDetails}
      />

      {/* Detail View Drawer/Modal */}
      <NotificationDetailsModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNotification(null);
        }}
      />
    </div>
  );
};

export default Notifications;
