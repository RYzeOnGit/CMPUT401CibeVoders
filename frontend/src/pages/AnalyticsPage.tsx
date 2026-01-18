import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Filter, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useApplicationStore } from '../store/applicationStore';
import SankeyDiagram from '../components/SankeyDiagram';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { applications, fetchApplications } = useApplicationStore();
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180'>('all');

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filter applications based on date range
  const filteredApplications = useMemo(() => {
    let filtered = [...applications];

    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(
        (app) => new Date(app.date_applied) >= cutoffDate
      );
    }

    return filtered;
  }, [applications, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredApplications.length;
    const byStatus = filteredApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const interviewRate = total > 0 ? ((byStatus['Interview'] || 0) / total) * 100 : 0;
    const offerRate = total > 0 ? ((byStatus['Offer'] || 0) / total) * 100 : 0;
    const rejectionRate = total > 0 ? ((byStatus['Rejected'] || 0) / total) * 100 : 0;
    const ghostedRate = total > 0 ? ((byStatus['Ghosted'] || 0) / total) * 100 : 0;

    return {
      total,
      byStatus,
      interviewRate: interviewRate.toFixed(1),
      offerRate: offerRate.toFixed(1),
      rejectionRate: rejectionRate.toFixed(1),
      ghostedRate: ghostedRate.toFixed(1),
    };
  }, [filteredApplications]);

  // Prepare Sankey data - Applied on left, all outcomes on right
  const sankeyData = useMemo(() => {
    const nodes: Array<{ id: string; label: string }> = [
      { id: 'applied', label: 'Applied' },
      { id: 'interview', label: 'Interview' },
      { id: 'offer', label: 'Offer' },
      { id: 'rejected', label: 'Rejected' },
      { id: 'ghosted', label: 'Ghosted' },
    ];

    const links: Array<{ source: string; target: string; value: number }> = [];

    // Count each status directly from Applied
    const offerCount = filteredApplications.filter((app) => app.status === 'Offer').length;
    const rejectedCount = filteredApplications.filter((app) => app.status === 'Rejected').length;
    const interviewCount = filteredApplications.filter((app) => app.status === 'Interview').length;
    const ghostedCount = filteredApplications.filter((app) => app.status === 'Ghosted').length;

    // Applied -> Offer
    if (offerCount > 0) {
      links.push({ source: 'applied', target: 'offer', value: offerCount });
    }

    // Applied -> Rejected
    if (rejectedCount > 0) {
      links.push({ source: 'applied', target: 'rejected', value: rejectedCount });
    }

    // Applied -> Interview
    if (interviewCount > 0) {
      links.push({ source: 'applied', target: 'interview', value: interviewCount });
    }

    // Applied -> Ghosted
    if (ghostedCount > 0) {
      links.push({ source: 'applied', target: 'ghosted', value: ghostedCount });
    }

    return { nodes, links };
  }, [filteredApplications]);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800/95 backdrop-blur-md border-b border-gray-700/50 flex-shrink-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/table')}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Application Analytics
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">Visualize your application pipeline</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Time Range:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'all' | '30' | '90' | '180')}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
            </select>
          </div>
          <button
            onClick={() => fetchApplications()}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-100 text-sm flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 flex-shrink-0">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Applications</span>
              <BarChart3 size={18} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-100">{stats.total}</p>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Interview Rate</span>
              <TrendingUp size={18} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-gray-100">{stats.interviewRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.byStatus['Interview'] || 0} interviews
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Offer Rate</span>
              <TrendingUp size={18} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-100">{stats.offerRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.byStatus['Offer'] || 0} offers
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Rejection Rate</span>
              <TrendingDown size={18} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-gray-100">{stats.rejectionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.byStatus['Rejected'] || 0} rejections
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Ghosted Rate</span>
              <TrendingDown size={18} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-100">{stats.ghostedRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.byStatus['Ghosted'] || 0} ghosted
            </p>
          </div>
        </div>

        {/* Sankey Diagram */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <div className="mb-3 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-100 mb-1">Application Pipeline Flow</h2>
            <p className="text-sm text-gray-400">
              Visualize how your applications move through different stages
            </p>
          </div>
          {filteredApplications.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-gray-400">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
                <p>No applications to visualize</p>
                <p className="text-xs mt-1">Start applying to see your pipeline!</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <SankeyDiagram data={sankeyData} />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

