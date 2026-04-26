import { useState, useEffect } from 'react';
import { format, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { taskService } from '../services';
import type { Task } from '../types';
import { Add24Regular, Filter24Regular } from '@fluentui/react-icons';

export default function MyTasks() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // New task form
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const res = await taskService.getAll();
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await taskService.create({
        title: newTask.title,
        description: newTask.description || undefined,
        assignedToId: user!.id,
        dueDate: newTask.dueDate,
        priority: newTask.priority as any,
      } as any);
      setShowAddModal(false);
      setNewTask({ title: '', description: '', priority: 'MEDIUM', dueDate: format(new Date(), 'yyyy-MM-dd') });
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add task');
    }
  };

  const handleStatusUpdate = async (task: Task, status: string) => {
    try {
      await taskService.update(task.id, { status: status as any });
      fetchTasks();
    } catch {}
  };

  const filtered = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const todayTasks = filtered.filter(t => isToday(parseISO(t.dueDate)) || (isBefore(parseISO(t.dueDate), startOfDay(new Date())) && t.status !== 'COMPLETED'));
  const futureTasks = filtered.filter(t => !isToday(parseISO(t.dueDate)) && !isBefore(parseISO(t.dueDate), startOfDay(new Date())));

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="skeleton" style={{ width: 200, height: 28 }} /></div>
        <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>My Tasks</h1>
          <p>{tasks.length} total · {tasks.filter(t => t.status === 'COMPLETED').length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Add24Regular /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { value: 'all', label: 'All' },
          { value: 'NOT_STARTED', label: 'Not Started' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'BLOCKED', label: 'Blocked' },
        ].map(f => (
          <button
            key={f.value}
            className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Today's / Overdue Tasks */}
      {todayTasks.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3>Today & Overdue ({todayTasks.length})</h3>
          </div>
          <div className="card-body">
            <div className="task-list">
              {todayTasks.map(task => {
                const isOverdue = isBefore(parseISO(task.dueDate), startOfDay(new Date()));
                return (
                  <div key={task.id} className={`task-item ${isOverdue ? 'overdue' : ''}`}>
                    <div
                      className={`checkbox ${task.status === 'COMPLETED' ? 'completed' : ''}`}
                      onClick={() => handleStatusUpdate(task, task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED')}
                    >
                      {task.status === 'COMPLETED' && '✓'}
                    </div>
                    <div className="task-info">
                      <div className="task-title" style={{
                        textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                        opacity: task.status === 'COMPLETED' ? 0.6 : 1,
                      }}>
                        {task.title}
                      </div>
                      <div className="task-meta">
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        {task.isManagerAssigned ? <span>From {task.assignedBy?.name}</span> : <span>Self-assigned</span>}
                        {isOverdue && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Overdue</span>}
                        <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
                      </div>
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task, e.target.value)}
                      style={{
                        fontSize: 11, padding: '3px 6px', borderRadius: 6,
                        border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer',
                      }}
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Future Tasks */}
      {futureTasks.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Upcoming ({futureTasks.length})</h3></div>
          <div className="card-body">
            <div className="task-list">
              {futureTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div
                    className={`checkbox ${task.status === 'COMPLETED' ? 'completed' : ''}`}
                    onClick={() => handleStatusUpdate(task, task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED')}
                  >
                    {task.status === 'COMPLETED' && '✓'}
                  </div>
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      <span>Due {format(parseISO(task.dueDate), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h4>No tasks found</h4>
              <p>Add a self-assigned task or wait for your manager to assign one.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2>Add Self-Assigned Task</h2>
            <form onSubmit={handleAddTask}>
              <div className="form-group">
                <label>Task Title *</label>
                <input className="form-input" required value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What do you need to do?"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-textarea" value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details (optional)"
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-select" value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input className="form-input" type="date" value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
