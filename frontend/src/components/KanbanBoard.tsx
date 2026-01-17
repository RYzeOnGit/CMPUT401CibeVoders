/** Kanban Board component with drag-and-drop */
import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Application, ApplicationStatus } from '../types';
import { getStatusColor } from '../utils/statusColors';
import { formatDate } from '../utils/dateUtils';
import { useApplicationStore } from '../store/applicationStore';
import { Trash2, Search, X, MessageSquare } from 'lucide-react';

interface KanbanBoardProps {
  applications: Application[];
  onOpenCommunications?: (application: Application) => void;
}

interface SortableApplicationCardProps {
  application: Application;
}

const STATUSES: ApplicationStatus[] = ['Applied', 'Interview', 'Rejected', 'Offer'];

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`${className || ''} ${isOver ? 'border-primary-500! bg-primary-900/20!' : ''}`}
    >
      {children}
    </div>
  );
}

interface SortableApplicationCardProps {
  application: Application;
  onOpenCommunications?: (application: Application) => void;
}

function SortableApplicationCard({ application, onOpenCommunications }: SortableApplicationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id.toString() });
  const deleteApplication = useApplicationStore((state) => state.deleteApplication);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Delete application for ${application.company_name}?`)) {
      deleteApplication(application.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-gray-700/50 rounded-xl shadow-sm border border-gray-600/50 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-primary-500/50 hover:bg-gray-700 transition-all duration-200 transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-100 text-base mb-1">{application.company_name}</h3>
          <p className="text-sm text-gray-300 font-medium">{application.role_title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
              application.status
            )}`}
          >
            {application.status}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 mb-2">
        {application.location && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">📍</span>
            <p className="text-xs text-gray-400">{application.location}</p>
          </div>
        )}
        {application.duration && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">⏱️</span>
            <p className="text-xs text-gray-400">{application.duration}</p>
          </div>
        )}
        {application.source && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">🔗</span>
            <p className="text-xs text-gray-400">{application.source}</p>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">📅</span>
          <p className="text-xs text-gray-400">{formatDate(application.date_applied)}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-600/30">
        {onOpenCommunications && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenCommunications(application);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 transition-all p-1.5 rounded hover:bg-blue-900/30 z-10 pointer-events-auto"
            title="View updates"
            type="button"
          >
            <MessageSquare size={14} />
          </button>
        )}
        <button
          onClick={handleDeleteClick}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-1.5 rounded hover:bg-red-900/30 z-10 pointer-events-auto"
          title="Delete application"
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {application.notes && (
        <div className="mt-3 pt-3 border-t border-gray-600/50">
          <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{application.notes}</p>
        </div>
      )}
    </div>
  );
}

function KanbanBoard({ applications, onOpenCommunications }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const updateApplication = useApplicationStore((state) => state.updateApplication);

  // Filter applications based on search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) {
      return applications;
    }
    
    const query = searchQuery.toLowerCase();
    return applications.filter((app) => {
      return (
        app.company_name.toLowerCase().includes(query) ||
        app.role_title.toLowerCase().includes(query) ||
        app.location?.toLowerCase().includes(query) ||
        app.source?.toLowerCase().includes(query) ||
        app.notes?.toLowerCase().includes(query)
      );
    });
  }, [applications, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const groupedApplications = STATUSES.reduce((acc, status) => {
    acc[status] = filteredApplications.filter((app) => app.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, Application[]>);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const application = filteredApplications.find((app) => app.id.toString() === activeId);
    if (!application) return;

    // Check if dragging to a status column
    const targetStatus = STATUSES.find((status) => status === overId);
    if (targetStatus && application.status !== targetStatus) {
      updateApplication(application.id, { status: targetStatus });
      return;
    }

    // Check if dragging to another application card (find which column it's in)
    const overApplication = filteredApplications.find((app) => app.id.toString() === overId);
    if (overApplication && overApplication.status !== application.status) {
      updateApplication(application.id, { status: overApplication.status });
      return;
    }
  };

  const activeApplication = activeId
    ? filteredApplications.find((app) => app.id.toString() === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, role, location, source, or notes..."
            className="w-full pl-10 pr-10 py-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-800 text-gray-100 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-400">
            Found {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'} matching "{searchQuery}"
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-8">
        {STATUSES.map((status) => {
          const columnApps = groupedApplications[status];
          return (
            <div key={status} className="flex flex-col h-full">
              <div className="mb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-100 mb-1">{status}</h2>
              </div>
              <DroppableColumn 
                id={status}
                className="min-h-[500px] rounded-xl bg-gray-800/50 p-4 border-2 border-dashed border-gray-700/50 hover:border-primary-500/50 transition-colors"
              >
                <SortableContext
                  items={columnApps.map((app) => app.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                    {columnApps.map((application) => (
                      <SortableApplicationCard 
                        key={application.id} 
                        application={application}
                        onOpenCommunications={onOpenCommunications}
                      />
                    ))}
                  {columnApps.length === 0 && (
                    <div className="text-center text-gray-500 py-20">
                      <div className="text-4xl mb-2">📭</div>
                      <div className="text-sm">Drop applications here</div>
                    </div>
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeApplication ? (
          <div className="card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{activeApplication.company_name}</h3>
                <p className="text-sm text-gray-600">{activeApplication.role_title}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  activeApplication.status
                )}`}
              >
                {activeApplication.status}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;

