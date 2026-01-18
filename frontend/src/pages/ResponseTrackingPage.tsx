/**
 * Response Tracking Page - Response Tracking Statistics Page
 * 
 * How to open this page:
 * 1. Click the "Response Tracking" button (with BarChart icon) in the Dashboard top navigation bar
 * 2. Or directly access URL: /response-tracking
 * 
 * Features:
 * This page displays response tracking statistics for all applications, including:
 * - Global statistics: total applications, response rate, interview rate, offer rate, etc.
 * - Detailed response statistics for each application: interview invites, rejections, offers, etc.
 * 
 * Usage:
 * 1. Global statistics cards at the top display overall data
 * 2. Table below shows detailed response statistics for each application
 * 3. Click on an application row to view detailed communication records
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ArrowLeft, Phone, X, CheckCircle, Mail, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { communicationsApi } from '../api/client';
import type { ResponseTrackingSummary, GlobalResponseStatistics } from '../types';
import { formatDate } from '../utils/dateUtils';

function ResponseTrackingPage() {
  const navigate = useNavigate();
  const [globalStats, setGlobalStats] = useState<GlobalResponseStatistics | null>(null);
  const [summaries, setSummaries] = useState<ResponseTrackingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stats, summaryData] = await Promise.all([
        communicationsApi.getGlobalStatistics(),
        communicationsApi.getTrackingSummary(),
      ]);
      setGlobalStats(stats);
      setSummaries(summaryData);
    } catch (error) {
      console.error('Failed to fetch response tracking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Offer':
        return 'text-green-400 bg-green-900/30 border-green-700/50';
      case 'Interview':
        return 'text-blue-400 bg-blue-900/30 border-blue-700/50';
      case 'Rejected':
        return 'text-red-400 bg-red-900/30 border-red-700/50';
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-700/50';
    }
  };

  const getResponseTypeIcon = (type?: string) => {
    switch (type) {
      case 'Interview Invite':
        return <Phone className="text-green-400" size={16} />;
      case 'Offer':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'Rejection':
        return <X className="text-red-400" size={16} />;
      default:
        return <Mail className="text-blue-400" size={16} />;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Back Button: Click to return to Dashboard */}
              <button
                onClick={() => navigate('/table')}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-blue-400" size={20} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    Response Tracking
                  </h1>
                  <p className="text-xs text-gray-400">Monitor company responses and communications</p>
                </div>
              </div>
            </div>
            {/* Refresh Button: Click to refresh statistics data */}
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
              title="Refresh Data"
            >
              <TrendingUp size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Global Statistics Cards: Display overall response statistics */}
            {globalStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Applications Card */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Total Applications</span>
                    <Users className="text-blue-400" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{globalStats.total_applications}</p>
                </div>

                {/* Response Rate Card */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Response Rate</span>
                    <MessageSquare className="text-green-400" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{globalStats.response_rate}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {globalStats.total_communications} communications
                  </p>
                </div>

                {/* Interview Rate Card */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Interview Rate</span>
                    <Phone className="text-blue-400" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{globalStats.interview_rate}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {globalStats.total_interview_invites} interview invites
                  </p>
                </div>

                {/* Offer Rate Card */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Offer Rate</span>
                    <CheckCircle className="text-green-400" size={20} />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{globalStats.offer_rate}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {globalStats.total_offers} job offers
                  </p>
                </div>
              </div>
            )}

            {/* Detailed Statistics */}
            {globalStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-red-700/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <X className="text-red-400" size={20} />
                    <span className="text-sm text-gray-400">Rejections</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{globalStats.total_rejections}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-blue-700/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="text-blue-400" size={20} />
                    <span className="text-sm text-gray-400">Interview Invites</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{globalStats.total_interview_invites}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-green-700/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="text-green-400" size={20} />
                    <span className="text-sm text-gray-400">Job Offers</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{globalStats.total_offers}</p>
                </div>
              </div>
            )}

            {/* Applications Summary Table: Display response details for each application */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-gray-700/50">
                <h2 className="text-lg font-semibold text-gray-100">Application Response Details</h2>
                <p className="text-sm text-gray-400 mt-1">Click on an application row to view detailed communication records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Company/Position
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Total Responses
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Interview Invites
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Rejections
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Offer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Latest Response
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {summaries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          No response data available
                        </td>
                      </tr>
                    ) : (
                      summaries.map((summary) => (
                          <tr
                            key={summary.application_id}
                            className="hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-100">{summary.company_name}</p>
                                <p className="text-xs text-gray-400">{summary.role_title}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                  summary.status
                                )}`}
                              >
                                {summary.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-100 font-medium">
                                {summary.total_responses}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-green-400 font-medium">
                                {summary.interview_invites}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-red-400 font-medium">
                                {summary.rejections}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-green-400 font-medium">
                                {summary.offers}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {summary.latest_response_date ? (
                                <div className="flex items-center gap-2">
                                  {getResponseTypeIcon(summary.latest_response_type)}
                                  <div>
                                    <p className="text-xs text-gray-300">
                                      {summary.latest_response_type}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatDate(summary.latest_response_date)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">None</span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

    </div>
  );
}

export default ResponseTrackingPage;
