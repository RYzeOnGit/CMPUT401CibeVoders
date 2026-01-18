/** Applications Table component with TanStack Table */
import { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import type { Application, Communication } from '../types';
import { getStatusColor } from '../utils/statusColors';
import { formatDate } from '../utils/dateUtils';
import { useApplicationStore } from '../store/applicationStore';
import EditableCell from './EditableCell';
import { Trash2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

interface ApplicationsTableProps {
  applications: Application[];
}

interface LastCommunicationMap {
  [applicationId: number]: Communication | null;
}

const columnHelper = createColumnHelper<Application>();

function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState('');
  const [lastCommunications, setLastCommunications] = useState<LastCommunicationMap>({});
  const [selectedApplicationForUpdate, setSelectedApplicationForUpdate] = useState<Application | null>(null);
  const [selectedApplicationForView, setSelectedApplicationForView] = useState<Application | null>(null);
  const [openMenuForApplication, setOpenMenuForApplication] = useState<number | null>(null);
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);

  // Fetch last communication for each application
  useEffect(() => {
    const fetchLastCommunications = async () => {
      const communicationsMap: LastCommunicationMap = {};
      
      await Promise.all(
        applications.map(async (app) => {
          try {
            const comms = await communicationsApi.getAll(app.id);
            const sorted = comms.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            communicationsMap[app.id] = sorted.length > 0 ? sorted[0] : null;
          } catch (error) {
            console.error(`Failed to fetch communications for application ${app.id}:`, error);
            communicationsMap[app.id] = null;
          }
        })
      );
      
      setLastCommunications(communicationsMap);
    };

    if (applications.length > 0) {
      fetchLastCommunications();
    }
  }, [applications]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('company_name', {
        header: 'Company',
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            onSave={(value) =>
              updateApplication(info.row.original.id, { company_name: value })
            }
          />
        ),
      }),
      columnHelper.accessor('role_title', {
        header: 'Role',
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            onSave={(value) =>
              updateApplication(info.row.original.id, { role_title: value })
            }
          />
        ),
      }),
      columnHelper.accessor('date_applied', {
        header: 'Date Applied',
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => (
          <EditableCell
            value={info.getValue() || ''}
            placeholder="Location"
            onSave={(value) =>
              updateApplication(info.row.original.id, { location: value || undefined })
            }
          />
        ),
      }),
      columnHelper.accessor('duration', {
        header: 'Duration',
        cell: (info) => (
          <EditableCell
            value={info.getValue() || ''}
            placeholder="Duration"
            onSave={(value) =>
              updateApplication(info.row.original.id, { duration: value || undefined })
            }
          />
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          return (
            <select
              value={status}
              onChange={(e) =>
                updateApplication(info.row.original.id, {
                  status: e.target.value as Application['status'],
                })
              }
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                status
              )} border-0 cursor-pointer`}
            >
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </select>
          );
        },
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: (info) => (
          <EditableCell
            value={info.getValue() || ''}
            placeholder="Source"
            onSave={(value) =>
              updateApplication(info.row.original.id, { source: value || undefined })
            }
          />
        ),
      }),
      columnHelper.accessor('notes', {
        header: 'Notes',
        cell: (info) => (
          <EditableCell
            value={info.getValue() || ''}
            placeholder="Add notes..."
            multiline
            onSave={(value) =>
              updateApplication(info.row.original.id, { notes: value || undefined })
            }
          />
        ),
      }),
      columnHelper.display({
        id: 'updates',
        header: 'Updates',
        cell: (info) => {
          const lastComm = lastCommunications[info.row.original.id];
          return (
            <UpdatesCell
              application={info.row.original}
              lastCommunication={lastComm}
              isMenuOpen={openMenuForApplication === info.row.original.id}
              onToggleMenu={() => {
                setOpenMenuForApplication(
                  openMenuForApplication === info.row.original.id 
                    ? null 
                    : info.row.original.id
                );
              }}
              onViewAll={() => {
                setOpenMenuForApplication(null);
                setSelectedApplicationForView(info.row.original);
              }}
              onAddUpdate={() => {
                setOpenMenuForApplication(null);
                setSelectedApplicationForUpdate(info.row.original);
              }}
            />
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.confirm(`Delete application for ${info.row.original.company_name}?`)) {
                  deleteApplication(info.row.original.id);
                }
              }}
              className="text-red-400 hover:text-red-300 transition-colors p-1.5 rounded hover:bg-red-900/30 opacity-70 hover:opacity-100"
              title="Delete application"
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      }),
    ],
    [updateApplication, deleteApplication, lastCommunications, openMenuForApplication]
  );

  const table = useReactTable({
    data: applications,
    columns,
    state: {
      sorting,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue || '').toLowerCase();
      if (!search) return true;
      
      const app = row.original;
      return !!(
        app.company_name.toLowerCase().includes(search) ||
        app.role_title.toLowerCase().includes(search) ||
        (app.location && app.location.toLowerCase().includes(search)) ||
        (app.duration && app.duration.toLowerCase().includes(search)) ||
        app.status.toLowerCase().includes(search) ||
        (app.source && app.source.toLowerCase().includes(search)) ||
        (app.notes && app.notes.toLowerCase().includes(search))
      );
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-gray-800/50 rounded-xl shadow-sm border border-gray-700/50 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search by company, role, location, duration, status, source, or notes..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100 placeholder-gray-400"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {globalFilter && (
          <div className="mt-2 text-sm text-gray-400">
            Found {table.getFilteredRowModel().rows.length} {table.getFilteredRowModel().rows.length === 1 ? 'application' : 'applications'} matching "{globalFilter}"
          </div>
        )}
      </div>

      <div className="bg-gray-800/50 rounded-xl shadow-sm border border-gray-700/50 overflow-hidden w-full overflow-x-auto">
        <div className="w-full min-w-full">
        <table className="w-full divide-y divide-gray-700 table-auto min-w-[800px] md:min-w-0">
          <thead className="bg-gradient-to-r from-gray-800 to-gray-700/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="text-primary-600">
                          {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-gray-800/30 divide-y divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr 
                key={row.id} 
                className="hover:bg-gradient-to-r hover:from-primary-900/20 hover:to-transparent transition-all duration-150 group"
              >
                {row.getVisibleCells().map((cell) => (
                  <td 
                    key={cell.id} 
                    className="px-4 py-4 text-sm text-gray-200 group-hover:text-gray-100"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="bg-gray-800/30 border-t border-gray-700/50 px-2 md:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-400">Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="px-2 py-1 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[5, 10, 20, 30, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs sm:text-sm text-gray-400">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Previous</span>
          </button>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            {Array.from({ length: table.getPageCount() }, (_, i) => i).map((pageIndex) => {
              // Show first page, last page, current page, and pages around current
              const currentPage = table.getState().pagination.pageIndex;
              const totalPages = table.getPageCount();
              
              if (
                pageIndex === 0 ||
                pageIndex === totalPages - 1 ||
                (pageIndex >= currentPage - 1 && pageIndex <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageIndex}
                    onClick={() => table.setPageIndex(pageIndex)}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      table.getState().pagination.pageIndex === pageIndex
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {pageIndex + 1}
                  </button>
                );
              } else if (
                pageIndex === currentPage - 2 ||
                pageIndex === currentPage + 2
              ) {
                return (
                  <span key={pageIndex} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>
          
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
        </div>
      </div>

      {/* Create Update Modal */}
      {selectedApplicationForUpdate && (
        <CreateCommunicationModal
          application={selectedApplicationForUpdate}
          onClose={() => setSelectedApplicationForUpdate(null)}
          onSuccess={() => {
            setSelectedApplicationForUpdate(null);
            // Refresh last communications
            const fetchLastCommunication = async () => {
              try {
                const comms = await communicationsApi.getAll(selectedApplicationForUpdate.id);
                const sorted = comms.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setLastCommunications((prev) => ({
                  ...prev,
                  [selectedApplicationForUpdate.id]: sorted.length > 0 ? sorted[0] : null,
                }));
              } catch (error) {
                console.error('Failed to refresh communications:', error);
              }
            };
            fetchLastCommunication();
          }}
        />
      )}

      {/* View All Updates Panel */}
      {selectedApplicationForView && (
        <CommunicationsPanel
          application={selectedApplicationForView}
          onClose={() => setSelectedApplicationForView(null)}
        />
      )}
    </div>
  );
}

interface UpdatesCellProps {
  application: Application;
  lastCommunication: Communication | null;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onViewAll: () => void;
  onAddUpdate: () => void;
}

function UpdatesCell({ 
  application, 
  lastCommunication, 
  isMenuOpen,
  onToggleMenu,
  onViewAll,
  onAddUpdate 
}: UpdatesCellProps) {
  return (
    <div className="relative">
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleMenu();
        }}
        className="cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 transition-colors min-h-[60px] flex flex-col justify-center"
        title="Click to view options"
      >
        {lastCommunication ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">
              {formatDate(lastCommunication.timestamp)}
            </div>
            <div className="text-sm text-gray-200 line-clamp-2">
              <span className="font-medium text-primary-400">{lastCommunication.type}:</span>{' '}
              {lastCommunication.message || 'No message'}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Plus size={14} />
            <span>Add update</span>
          </div>
        )}
      </div>

      {/* Menu Dropdown */}
      {isMenuOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleMenu();
            }}
          />
          {/* Menu */}
          <div className="absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[180px] overflow-hidden">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onViewAll();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Eye size={16} className="text-blue-400" />
              View all updates
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddUpdate();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2 border-t border-gray-700"
            >
              <MessageSquare size={16} className="text-primary-400" />
              Add update
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ApplicationsTable;

