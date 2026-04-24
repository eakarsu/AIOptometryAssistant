import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  Users,
  Eye,
  FileText,
  Glasses,
  Shield,
  Package,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader,
  Brain,
  Zap,
  Calendar,
  DollarSign,
  CircleDot,
  ScanEye,
  BarChart3,
  Bell,
  Clock,
  Phone,
  Mail,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react';
import { api } from './services/api';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const isAuthenticated = () => !!localStorage.getItem('token');

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

/** Convert snake_case key to Title Case label */
const snakeToTitle = (str) =>
  str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Render a markdown string as React JSX.
 * Handles: headings, bold, italic, ordered lists, unordered lists,
 * paragraph breaks, and inline code.
 */
const renderMarkdown = (text) => {
  if (!text || typeof text !== 'string') return <p>No content available.</p>;

  const blocks = text.split(/\n\n+/);
  const elements = [];

  blocks.forEach((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Check if the block is a list (ordered or unordered)
    const lines = trimmed.split('\n');
    const isUnorderedList = lines.every((l) => /^\s*[-*]\s+/.test(l.trim()));
    const isOrderedList = lines.every((l) => /^\s*\d+\.\s+/.test(l.trim()));

    if (isUnorderedList) {
      elements.push(
        <ul key={blockIdx} style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          {lines.map((l, i) => (
            <li key={i} style={{ marginBottom: '0.25rem' }}>
              {renderInline(l.replace(/^\s*[-*]\s+/, ''))}
            </li>
          ))}
        </ul>
      );
      return;
    }

    if (isOrderedList) {
      elements.push(
        <ol key={blockIdx} style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          {lines.map((l, i) => (
            <li key={i} style={{ marginBottom: '0.25rem' }}>
              {renderInline(l.replace(/^\s*\d+\.\s+/, ''))}
            </li>
          ))}
        </ol>
      );
      return;
    }

    // Handle lines individually for headings, or mixed content
    lines.forEach((line, lineIdx) => {
      const key = `${blockIdx}-${lineIdx}`;
      const lt = line.trim();

      if (/^####\s+/.test(lt)) {
        elements.push(<h6 key={key} style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.9rem', fontWeight: 600 }}>{renderInline(lt.replace(/^####\s+/, ''))}</h6>);
      } else if (/^###\s+/.test(lt)) {
        elements.push(<h5 key={key} style={{ margin: '0.75rem 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>{renderInline(lt.replace(/^###\s+/, ''))}</h5>);
      } else if (/^##\s+/.test(lt)) {
        elements.push(<h4 key={key} style={{ margin: '0.75rem 0 0.25rem', fontSize: '1.05rem', fontWeight: 700 }}>{renderInline(lt.replace(/^##\s+/, ''))}</h4>);
      } else if (/^#\s+/.test(lt)) {
        elements.push(<h3 key={key} style={{ margin: '0.75rem 0 0.25rem', fontSize: '1.15rem', fontWeight: 700 }}>{renderInline(lt.replace(/^#\s+/, ''))}</h3>);
      } else if (/^\s*[-*]\s+/.test(lt)) {
        // Stray bullet in a mixed block
        elements.push(
          <ul key={key} style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
            <li>{renderInline(lt.replace(/^\s*[-*]\s+/, ''))}</li>
          </ul>
        );
      } else if (/^\s*\d+\.\s+/.test(lt)) {
        elements.push(
          <ol key={key} style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
            <li>{renderInline(lt.replace(/^\s*\d+\.\s+/, ''))}</li>
          </ol>
        );
      } else if (lt) {
        elements.push(<p key={key} style={{ margin: '0.4rem 0', lineHeight: 1.6 }}>{renderInline(lt)}</p>);
      }
    });
  });

  return <>{elements}</>;
};

/** Convert inline markdown (bold, italic, code) to JSX */
const renderInline = (text) => {
  if (!text) return null;
  // Split on bold (**text**), italic (*text*), and inline code (`text`)
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // bold
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      // italic
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      // inline code
      parts.push(
        <code key={match.index} style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: 4, fontSize: '0.9em' }}>
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

/* ------------------------------------------------------------------ */
/*  Login Page                                                         */
/* ------------------------------------------------------------------ */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(email, password);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user || { email }));
        navigate('/');
      } else {
        setError(data.error || data.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('sarah@optometry.com');
    setPassword('password123');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Eye size={40} className="login-icon" />
          <h1>AI Optometry Assistant</h1>
          <p>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader className="spinner" size={18} /> : 'Sign In'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={handleDemoFill}
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Zap size={16} /> Demo Login
          </button>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Layout (Sidebar + Header + Content)                                */
/* ------------------------------------------------------------------ */
const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/retinal-scans', label: 'Retinal Scans', icon: Eye },
  { path: '/prescriptions', label: 'Prescriptions', icon: FileText },
  { path: '/frames', label: 'Frames', icon: Glasses },
  { path: '/insurance', label: 'Insurance', icon: Shield },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/appointments', label: 'Appointments', icon: Calendar },
  { path: '/billing', label: 'Billing', icon: DollarSign },
  { path: '/contact-lenses', label: 'Contact Lenses', icon: CircleDot },
  { path: '/visual-acuity', label: 'Visual Acuity', icon: ScanEye },
  { path: '/recalls', label: 'Patient Recalls', icon: Bell },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
];

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`app-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Eye size={28} />
          {sidebarOpen && <span>OptometryAI</span>}
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="top-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 className="page-title">AI Optometry Assistant</h2>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user.name || user.email || 'Doctor'}</span>
              <span className="user-role">{user.role || 'Optometrist'}</span>
            </div>
          </div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [dashData, setDashData] = useState(null);
  const [overdueRecalls, setOverdueRecalls] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [patients, scans, prescriptions, frames, insurance, inventory, appointments, billing, contactLenses, visualAcuity, dashboard, recalls, stockAlerts] =
          await Promise.allSettled([
            api.getAll('patients'),
            api.getAll('retinal-scans'),
            api.getAll('prescriptions'),
            api.getAll('frames'),
            api.getAll('insurance'),
            api.getAll('inventory'),
            api.getAll('appointments'),
            api.getAll('billing'),
            api.getAll('contact-lenses'),
            api.getAll('visual-acuity'),
            api.getDashboardStats(),
            api.getOverdueRecalls(),
            api.getInventoryAlerts(),
          ]);
        const c = (r) => r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value.length : 0) : 0;
        const v = (r) => r.status === 'fulfilled' ? r.value : null;
        setStats({
          patients: c(patients), scans: c(scans), prescriptions: c(prescriptions),
          frames: c(frames), insurance: c(insurance), inventory: c(inventory),
          appointments: c(appointments), billing: c(billing),
          contactLenses: c(contactLenses), visualAcuity: c(visualAcuity),
        });
        setDashData(v(dashboard));
        setOverdueRecalls(Array.isArray(v(recalls)) ? v(recalls) : []);
        setLowStockItems(Array.isArray(v(stockAlerts)) ? v(stockAlerts) : []);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const cards = [
    { label: 'Patients', count: stats.patients, icon: Users, color: '#2563eb', path: '/patients' },
    { label: 'Retinal Scans', count: stats.scans, icon: Eye, color: '#0891b2', path: '/retinal-scans' },
    { label: 'Prescriptions', count: stats.prescriptions, icon: FileText, color: '#7c3aed', path: '/prescriptions' },
    { label: 'Frames', count: stats.frames, icon: Glasses, color: '#059669', path: '/frames' },
    { label: 'Insurance', count: stats.insurance, icon: Shield, color: '#d97706', path: '/insurance' },
    { label: 'Inventory', count: stats.inventory, icon: Package, color: '#dc2626', path: '/inventory' },
    { label: 'Appointments', count: stats.appointments, icon: Calendar, color: '#0d9488', path: '/appointments' },
    { label: 'Billing', count: stats.billing, icon: DollarSign, color: '#9333ea', path: '/billing' },
    { label: 'Contact Lenses', count: stats.contactLenses, icon: CircleDot, color: '#e11d48', path: '/contact-lenses' },
    { label: 'Visual Acuity', count: stats.visualAcuity, icon: ScanEye, color: '#0369a1', path: '/visual-acuity' },
  ];

  if (loading) return <div className="loading-container"><Loader className="spinner" size={40} /></div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, Doctor</h1>
        <p>Here is an overview of your practice today.</p>
      </div>

      {/* Key Metrics */}
      {dashData && (
        <div className="key-metrics">
          <div className="metric-card metric-blue">
            <div className="metric-icon"><Calendar size={24} /></div>
            <div className="metric-data">
              <span className="metric-value">{dashData.today_appointments}</span>
              <span className="metric-label">Today's Appointments</span>
            </div>
          </div>
          <div className="metric-card metric-green">
            <div className="metric-icon"><DollarSign size={24} /></div>
            <div className="metric-data">
              <span className="metric-value">${dashData.month_revenue?.toLocaleString() || '0'}</span>
              <span className="metric-label">Revenue This Month</span>
            </div>
          </div>
          <div className="metric-card metric-orange">
            <div className="metric-icon"><AlertCircle size={24} /></div>
            <div className="metric-data">
              <span className="metric-value">{dashData.low_stock_items}</span>
              <span className="metric-label">Low Stock Items</span>
            </div>
          </div>
          <div className="metric-card metric-purple">
            <div className="metric-icon"><Users size={24} /></div>
            <div className="metric-data">
              <span className="metric-value">{dashData.new_patients_this_month}</span>
              <span className="metric-label">New Patients This Month</span>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule + Alerts */}
      <div className="dashboard-panels">
        {/* Today's Schedule */}
        {dashData && dashData.today_schedule && (
          <div className="panel-card">
            <div className="panel-header">
              <Clock size={20} />
              <h3>Today's Schedule</h3>
              <span className="badge badge-info">{dashData.today_schedule.length}</span>
            </div>
            <div className="panel-body">
              {dashData.today_schedule.length === 0 ? (
                <p className="panel-empty">No appointments scheduled for today.</p>
              ) : (
                <div className="schedule-list">
                  {dashData.today_schedule.map((appt) => (
                    <div key={appt.id} className="schedule-item">
                      <span className="schedule-time">{appt.appointment_time}</span>
                      <span className="schedule-patient">{appt.first_name} {appt.last_name}</span>
                      <span className="schedule-type">{appt.appointment_type}</span>
                      <span className={`badge badge-${appt.status === 'completed' ? 'success' : appt.status === 'cancelled' ? 'danger' : 'info'}`}>
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overdue Recalls */}
        <div className="panel-card">
          <div className="panel-header">
            <Bell size={20} />
            <h3>Overdue Recalls</h3>
            {overdueRecalls.length > 0 && <span className="badge badge-danger">{overdueRecalls.length}</span>}
          </div>
          <div className="panel-body">
            {overdueRecalls.length === 0 ? (
              <p className="panel-empty">No overdue patient recalls.</p>
            ) : (
              <div className="recall-list">
                {overdueRecalls.slice(0, 5).map((recall) => (
                  <div key={recall.id} className="recall-item">
                    <div className="recall-patient">{recall.first_name} {recall.last_name}</div>
                    <div className="recall-meta">
                      <span>{recall.recall_type}</span>
                      <span className="recall-date">{recall.recall_date?.split('T')[0]}</span>
                    </div>
                  </div>
                ))}
                {overdueRecalls.length > 5 && (
                  <Link to="/recalls" className="panel-more">View all {overdueRecalls.length} overdue recalls</Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="panel-card">
          <div className="panel-header">
            <Package size={20} />
            <h3>Low Stock Alerts</h3>
            {lowStockItems.length > 0 && <span className="badge badge-warning">{lowStockItems.length}</span>}
          </div>
          <div className="panel-body">
            {lowStockItems.length === 0 ? (
              <p className="panel-empty">All inventory levels are healthy.</p>
            ) : (
              <div className="stock-alert-list">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="stock-alert-item">
                    <span className="stock-name">{item.item_name}</span>
                    <div className="stock-levels">
                      <span className="stock-qty">{item.quantity} left</span>
                      <span className="stock-reorder">reorder at {item.reorder_level}</span>
                    </div>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <Link to="/inventory" className="panel-more">View all {lowStockItems.length} low stock items</Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pending Payments */}
        {dashData && (
          <div className="panel-card">
            <div className="panel-header">
              <DollarSign size={20} />
              <h3>Outstanding Balance</h3>
            </div>
            <div className="panel-body">
              <div className="balance-info">
                <div className="balance-amount">${dashData.pending_balance?.toLocaleString() || '0'}</div>
                <div className="balance-count">{dashData.pending_invoices} unpaid invoices</div>
                <Link to="/billing" className="btn btn-sm btn-primary" style={{ marginTop: '0.75rem' }}>
                  View Billing
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link to={card.path} key={card.label} className="dashboard-card">
              <div className="card-icon" style={{ backgroundColor: card.color + '15', color: card.color }}>
                <Icon size={28} />
              </div>
              <div className="card-info">
                <span className="card-count">{card.count ?? '--'}</span>
                <span className="card-label">{card.label}</span>
              </div>
              <ChevronRight size={20} className="card-arrow" />
            </Link>
          );
        })}
      </div>

      {/* AI Quick Actions */}
      <div className="ai-section">
        <h2><Brain size={22} /> AI Quick Actions</h2>
        <div className="ai-actions-grid">
          <div className="ai-action-card">
            <Activity size={24} />
            <h3>Analyze Retinal Scan</h3>
            <p>Use AI to detect anomalies in retinal images</p>
            <Link to="/retinal-scans" className="btn btn-sm btn-primary">Go to Scans</Link>
          </div>
          <div className="ai-action-card">
            <TrendingUp size={24} />
            <h3>Prescription Trends</h3>
            <p>AI-powered analysis of prescription history</p>
            <Link to="/prescriptions" className="btn btn-sm btn-secondary">View Trends</Link>
          </div>
          <div className="ai-action-card">
            <Glasses size={24} />
            <h3>Frame Recommendations</h3>
            <p>Personalized frame suggestions for patients</p>
            <Link to="/frames" className="btn btn-sm btn-accent">Recommend</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Generic Resource Page                                              */
/* ------------------------------------------------------------------ */
const ResourcePage = ({ title, resource, columns, formFields, icon: Icon, aiAction, aiLabel }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Derive form fields from formFields prop, or fall back to columns
  const resolvedFormFields = formFields || columns.map((col) => ({
    key: col.key,
    label: col.label,
    type: 'text',
  }));

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.getAll(resource);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [resource]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    await api.delete(resource, id);
    fetchItems();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.id) {
      await api.update(resource, formData.id, formData);
    } else {
      await api.create(resource, formData);
    }
    setShowForm(false);
    setFormData({});
    fetchItems();
  };

  const handleAiAction = async (item) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await aiAction(item);
      setAiResult(result);
    } catch {
      setAiResult({ error: 'AI analysis failed. Please try again.' });
    } finally {
      setAiLoading(false);
    }
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowModal(true);
    setAiResult(null);
  };

  const filteredItems = items.filter((item) =>
    Object.values(item).some(
      (val) =>
        typeof val === 'string' && val.toLowerCase().includes(search.toLowerCase())
    )
  );

  /** Extract the markdown text from an AI result object */
  const getAiMarkdown = (result) => {
    if (!result) return null;
    if (result.error) return null;
    if (typeof result === 'string') return result;
    // The backend returns { analysis: "..." } or { recommendations: "..." }
    if (result.analysis) return result.analysis;
    if (result.recommendations) return result.recommendations;
    // Fallback: try to find any string value
    const strVal = Object.values(result).find((v) => typeof v === 'string' && v.length > 20);
    if (strVal) return strVal;
    // Last resort: stringify
    return JSON.stringify(result, null, 2);
  };

  return (
    <div className="resource-page">
      <div className="resource-header">
        <div className="resource-title">
          <Icon size={28} />
          <h1>{title}</h1>
          <span className="badge badge-info">{items.length} total</span>
        </div>
        <div className="resource-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setFormData({}); setShowForm(true); }}
          >
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><Loader className="spinner" size={40} /></div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <Icon size={48} />
          <h3>No {title.toLowerCase()} found</h3>
          <p>Get started by adding your first record.</p>
          <button className="btn btn-primary" onClick={() => { setFormData({}); setShowForm(true); }}>
            <Plus size={18} /> Add {title.slice(0, -1) || title}
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  style={{ cursor: 'pointer' }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(item[col.key], item) : item[col.key] ?? '--'}
                    </td>
                  ))}
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => openDetail(item)}
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => { setFormData(item); setShowForm(true); }}
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      {aiAction && (
                        <button
                          className="btn btn-sm btn-accent"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowModal(true);
                            handleAiAction(item);
                          }}
                          title={aiLabel || 'AI Analyze'}
                        >
                          <Brain size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(selectedItem)
                  .filter(([key]) => key !== '__v' && key !== 'created_at' && key !== 'updated_at')
                  .map(([key, value]) => (
                    <div className="detail-item" key={key}>
                      <span className="detail-label">{snakeToTitle(key)}</span>
                      <span className="detail-value">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value, null, 2)
                          : String(value ?? '--')}
                      </span>
                    </div>
                  ))}
              </div>

              {/* AI Result */}
              {aiLoading && (
                <div className="ai-loading">
                  <Loader className="spinner" size={24} />
                  <span>AI is analyzing...</span>
                </div>
              )}
              {aiResult && (
                <div className="ai-result-card">
                  <div className="ai-result-header">
                    <Brain size={20} />
                    <h3>AI Analysis</h3>
                  </div>
                  <div className="ai-result-body">
                    {aiResult.error ? (
                      <div className="ai-error">
                        <AlertTriangle size={18} />
                        <span>{aiResult.error}</span>
                      </div>
                    ) : (
                      <div className="ai-output">
                        {renderMarkdown(getAiMarkdown(aiResult))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formData.id ? 'Edit' : 'Add New'} {title.slice(0, -1) || title}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                {resolvedFormFields.map((field) => (
                  <div className="form-group" key={field.key}>
                    <label>{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      >
                        <option value="">-- Select --</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt.value ?? opt} value={opt.value ?? opt}>
                            {opt.label ?? opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={formData[field.key] || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
                          })
                        }
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        step={field.step}
                      />
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <CheckCircle size={18} /> {formData.id ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Page definitions                                                   */
/* ------------------------------------------------------------------ */
const PatientsPage = () => (
  <ResourcePage
    title="Patients"
    resource="patients"
    icon={Users}
    columns={[
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'date_of_birth', label: 'Date of Birth' },
    ]}
    formFields={[
      { key: 'first_name', label: 'First Name', type: 'text' },
      { key: 'last_name', label: 'Last Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    ]}
  />
);

const RetinalScansPage = () => (
  <ResourcePage
    title="Retinal Scans"
    resource="retinal-scans"
    icon={Eye}
    columns={[
      {
        key: 'patient_name',
        label: 'Patient',
        render: (_val, item) => {
          if (item.patient_name) return item.patient_name;
          if (item.first_name || item.last_name) return `${item.first_name || ''} ${item.last_name || ''}`.trim();
          return item.patient_id || '--';
        },
      },
      { key: 'scan_date', label: 'Date' },
      { key: 'eye', label: 'Eye' },
      {
        key: 'risk_level',
        label: 'Risk Level',
        render: (val) => (
          <span className={`badge badge-${val === 'high' || val === 'critical' ? 'danger' : val === 'moderate' || val === 'medium' ? 'warning' : val === 'low' ? 'success' : 'info'}`}>
            {val || 'pending'}
          </span>
        ),
      },
      {
        key: 'findings',
        label: 'Findings',
        render: (val) => val ? (val.length > 50 ? val.substring(0, 50) + '...' : val) : '--',
      },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'scan_date', label: 'Scan Date', type: 'date' },
      { key: 'eye', label: 'Eye', type: 'select', options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'both', label: 'Both' },
      ]},
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ]},
      { key: 'findings', label: 'Findings', type: 'textarea' },
      { key: 'image_url', label: 'Image URL', type: 'text' },
    ]}
    aiAction={api.aiAnalyzeRetinalScan}
    aiLabel="AI Analyze Scan"
  />
);

const PrescriptionsPage = () => (
  <ResourcePage
    title="Prescriptions"
    resource="prescriptions"
    icon={FileText}
    columns={[
      {
        key: 'patient_name',
        label: 'Patient',
        render: (_val, item) => {
          if (item.patient_name) return item.patient_name;
          if (item.first_name || item.last_name) return `${item.first_name || ''} ${item.last_name || ''}`.trim();
          return item.patient_id || '--';
        },
      },
      { key: 'exam_date', label: 'Exam Date' },
      { key: 'right_sphere', label: 'OD Sphere' },
      { key: 'left_sphere', label: 'OS Sphere' },
      { key: 'pd', label: 'PD' },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'exam_date', label: 'Exam Date', type: 'date' },
      { key: 'right_sphere', label: 'OD Sphere', type: 'number', step: '0.25' },
      { key: 'right_cylinder', label: 'OD Cylinder', type: 'number', step: '0.25' },
      { key: 'right_axis', label: 'OD Axis', type: 'number' },
      { key: 'left_sphere', label: 'OS Sphere', type: 'number', step: '0.25' },
      { key: 'left_cylinder', label: 'OS Cylinder', type: 'number', step: '0.25' },
      { key: 'left_axis', label: 'OS Axis', type: 'number' },
      { key: 'pd', label: 'PD (mm)', type: 'number', step: '0.5' },
    ]}
    aiAction={api.aiPrescriptionTrends}
    aiLabel="AI Trends"
  />
);

const FramesPage = () => (
  <ResourcePage
    title="Frames"
    resource="frames"
    icon={Glasses}
    columns={[
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'material', label: 'Material' },
      { key: 'price', label: 'Price', render: (val) => val != null ? `$${val}` : '--' },
      {
        key: 'in_stock',
        label: 'Stock',
        render: (val) => (
          <span className={`badge badge-${val ? 'success' : 'danger'}`}>
            {val ? 'In Stock' : 'Out of Stock'}
          </span>
        ),
      },
    ]}
    formFields={[
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'material', label: 'Material', type: 'select', options: [
        { value: 'metal', label: 'Metal' },
        { value: 'plastic', label: 'Plastic' },
        { value: 'titanium', label: 'Titanium' },
        { value: 'acetate', label: 'Acetate' },
        { value: 'wood', label: 'Wood' },
      ]},
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'price', label: 'Price ($)', type: 'number', step: '0.01' },
      { key: 'in_stock', label: 'In Stock', type: 'select', options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ]},
    ]}
    aiAction={api.aiFrameRecommendation}
    aiLabel="AI Recommend"
  />
);

const InsurancePage = () => (
  <ResourcePage
    title="Insurance"
    resource="insurance"
    icon={Shield}
    columns={[
      {
        key: 'patient_name',
        label: 'Patient',
        render: (_val, item) => {
          if (item.patient_name) return item.patient_name;
          if (item.first_name || item.last_name) return `${item.first_name || ''} ${item.last_name || ''}`.trim();
          return item.patient_id || '--';
        },
      },
      { key: 'provider', label: 'Provider' },
      { key: 'policy_number', label: 'Policy #' },
      {
        key: 'verification_status',
        label: 'Status',
        render: (val) => (
          <span className={`badge badge-${val === 'verified' ? 'success' : val === 'denied' ? 'danger' : 'warning'}`}>
            {val || 'pending'}
          </span>
        ),
      },
      { key: 'coverage_type', label: 'Coverage' },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'provider', label: 'Provider', type: 'text' },
      { key: 'policy_number', label: 'Policy Number', type: 'text' },
      { key: 'coverage_type', label: 'Coverage Type', type: 'select', options: [
        { value: 'vision', label: 'Vision' },
        { value: 'medical', label: 'Medical' },
        { value: 'both', label: 'Both' },
      ]},
      { key: 'verification_status', label: 'Verification Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' },
        { value: 'verified', label: 'Verified' },
        { value: 'denied', label: 'Denied' },
      ]},
      { key: 'expiration_date', label: 'Expiration Date', type: 'date' },
    ]}
    aiAction={api.aiVerifyInsurance}
    aiLabel="AI Verify"
  />
);

const InventoryPage = () => (
  <ResourcePage
    title="Inventory"
    resource="inventory"
    icon={Package}
    columns={[
      { key: 'item_name', label: 'Item' },
      { key: 'category', label: 'Category' },
      { key: 'brand', label: 'Brand' },
      { key: 'quantity', label: 'Qty' },
      {
        key: 'reorder_level',
        label: 'Reorder At',
        render: (val, item) => {
          const low = item.quantity != null && item.reorder_level != null && item.quantity <= item.reorder_level;
          return (
            <span>
              {val ?? '--'}{' '}
              {low && <span className="badge badge-danger" style={{ marginLeft: '0.3rem' }}>Low Stock</span>}
            </span>
          );
        },
      },
    ]}
    formFields={[
      { key: 'item_name', label: 'Item Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
      { key: 'unit_cost', label: 'Unit Cost ($)', type: 'number', step: '0.01' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
    ]}
    aiAction={api.aiInventoryOptimization}
    aiLabel="AI Optimize"
  />
);

const AppointmentsPage = () => (
  <ResourcePage
    title="Appointments"
    resource="appointments"
    icon={Calendar}
    columns={[
      {
        key: 'patient_name', label: 'Patient',
        render: (_val, item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.patient_id || '--',
      },
      { key: 'appointment_date', label: 'Date' },
      { key: 'appointment_time', label: 'Time' },
      { key: 'appointment_type', label: 'Type' },
      {
        key: 'status', label: 'Status',
        render: (val) => (
          <span className={`badge badge-${val === 'completed' ? 'success' : val === 'cancelled' ? 'danger' : val === 'no-show' ? 'warning' : 'info'}`}>
            {val || 'scheduled'}
          </span>
        ),
      },
      { key: 'room', label: 'Room' },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'doctor_name', label: 'Doctor', type: 'text' },
      { key: 'appointment_date', label: 'Date', type: 'date' },
      { key: 'appointment_time', label: 'Time', type: 'text' },
      { key: 'duration_minutes', label: 'Duration (min)', type: 'number' },
      { key: 'appointment_type', label: 'Type', type: 'select', options: [
        'Comprehensive Exam', 'Medical Eye Exam', 'Contact Lens Fitting',
        'Contact Lens Follow-up', 'Glaucoma Follow-up', 'Glasses Check',
        'Diabetic Eye Exam', 'Pre-Op Evaluation', 'Emergency',
      ]},
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no-show', label: 'No Show' },
      ]},
      { key: 'room', label: 'Room', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    aiAction={api.aiAppointmentOptimization}
    aiLabel="AI Optimize"
  />
);

const BillingPage = () => (
  <ResourcePage
    title="Billing"
    resource="billing"
    icon={DollarSign}
    columns={[
      {
        key: 'patient_name', label: 'Patient',
        render: (_val, item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.patient_id || '--',
      },
      { key: 'invoice_number', label: 'Invoice #' },
      { key: 'invoice_date', label: 'Date' },
      { key: 'amount', label: 'Amount', render: (val) => val != null ? `$${Number(val).toFixed(2)}` : '--' },
      {
        key: 'payment_status', label: 'Status',
        render: (val) => (
          <span className={`badge badge-${val === 'paid' ? 'success' : val === 'overdue' ? 'danger' : val === 'partial' ? 'warning' : 'info'}`}>
            {val || 'pending'}
          </span>
        ),
      },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'invoice_number', label: 'Invoice Number', type: 'text' },
      { key: 'invoice_date', label: 'Invoice Date', type: 'date' },
      { key: 'service_description', label: 'Service Description', type: 'textarea' },
      { key: 'service_code', label: 'Service Code (CPT)', type: 'text' },
      { key: 'amount', label: 'Total Amount ($)', type: 'number', step: '0.01' },
      { key: 'insurance_covered', label: 'Insurance Covered ($)', type: 'number', step: '0.01' },
      { key: 'patient_responsibility', label: 'Patient Responsibility ($)', type: 'number', step: '0.01' },
      { key: 'payment_status', label: 'Payment Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'partial', label: 'Partial' },
        { value: 'overdue', label: 'Overdue' },
      ]},
      { key: 'payment_method', label: 'Payment Method', type: 'text' },
    ]}
    aiAction={api.aiBillingAnalysis}
    aiLabel="AI Analyze"
  />
);

const ContactLensesPage = () => (
  <ResourcePage
    title="Contact Lenses"
    resource="contact-lenses"
    icon={CircleDot}
    columns={[
      {
        key: 'patient_name', label: 'Patient',
        render: (_val, item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.patient_id || '--',
      },
      { key: 'fitting_date', label: 'Fitting Date' },
      { key: 'lens_brand', label: 'Brand' },
      { key: 'lens_type', label: 'Type' },
      { key: 'wear_schedule', label: 'Wear Schedule' },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'fitting_date', label: 'Fitting Date', type: 'date' },
      { key: 'lens_brand', label: 'Lens Brand', type: 'text' },
      { key: 'lens_type', label: 'Lens Type', type: 'select', options: [
        'Spherical Daily', 'Spherical Monthly', 'Toric Monthly', 'Toric Daily',
        'Multifocal Daily', 'Multifocal Monthly', 'Scleral RGP', 'Hybrid', 'Extended Wear',
      ]},
      { key: 'right_power', label: 'OD Power', type: 'number', step: '0.25' },
      { key: 'right_base_curve', label: 'OD Base Curve', type: 'number', step: '0.1' },
      { key: 'right_diameter', label: 'OD Diameter', type: 'number', step: '0.1' },
      { key: 'left_power', label: 'OS Power', type: 'number', step: '0.25' },
      { key: 'left_base_curve', label: 'OS Base Curve', type: 'number', step: '0.1' },
      { key: 'left_diameter', label: 'OS Diameter', type: 'number', step: '0.1' },
      { key: 'wear_schedule', label: 'Wear Schedule', type: 'text' },
      { key: 'replacement_schedule', label: 'Replacement Schedule', type: 'text' },
      { key: 'solution_recommended', label: 'Solution', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    aiAction={api.aiContactLensRecommendation}
    aiLabel="AI Recommend"
  />
);

const VisualAcuityPage = () => (
  <ResourcePage
    title="Visual Acuity"
    resource="visual-acuity"
    icon={ScanEye}
    columns={[
      {
        key: 'patient_name', label: 'Patient',
        render: (_val, item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.patient_id || '--',
      },
      { key: 'test_date', label: 'Test Date' },
      { key: 'right_corrected', label: 'OD Corrected' },
      { key: 'left_corrected', label: 'OS Corrected' },
      { key: 'both_corrected', label: 'OU Corrected' },
      { key: 'test_type', label: 'Test Type' },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'test_date', label: 'Test Date', type: 'date' },
      { key: 'test_type', label: 'Test Type', type: 'select', options: ['Snellen', 'LogMAR', 'ETDRS', 'Tumbling E'] },
      { key: 'test_distance', label: 'Test Distance', type: 'text' },
      { key: 'right_uncorrected', label: 'OD Uncorrected', type: 'text' },
      { key: 'right_corrected', label: 'OD Corrected', type: 'text' },
      { key: 'left_uncorrected', label: 'OS Uncorrected', type: 'text' },
      { key: 'left_corrected', label: 'OS Corrected', type: 'text' },
      { key: 'both_uncorrected', label: 'OU Uncorrected', type: 'text' },
      { key: 'both_corrected', label: 'OU Corrected', type: 'text' },
      { key: 'pinhole_right', label: 'Pinhole OD', type: 'text' },
      { key: 'pinhole_left', label: 'Pinhole OS', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    aiAction={api.aiVisualAcuityAnalysis}
    aiLabel="AI Analyze"
  />
);

/* ------------------------------------------------------------------ */
/*  Patient Recalls Page                                               */
/* ------------------------------------------------------------------ */
const RecallsPage = () => (
  <ResourcePage
    title="Patient Recalls"
    resource="recalls"
    icon={Bell}
    columns={[
      {
        key: 'patient_name', label: 'Patient',
        render: (_val, item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.patient_id || '--',
      },
      { key: 'recall_date', label: 'Recall Date', render: (val) => val?.split('T')[0] || '--' },
      { key: 'recall_type', label: 'Type' },
      { key: 'reason', label: 'Reason', render: (val) => val ? (val.length > 40 ? val.substring(0, 40) + '...' : val) : '--' },
      {
        key: 'status', label: 'Status',
        render: (val) => (
          <span className={`badge badge-${val === 'completed' ? 'success' : val === 'contacted' ? 'info' : val === 'overdue' ? 'danger' : 'warning'}`}>
            {val || 'pending'}
          </span>
        ),
      },
      { key: 'phone', label: 'Phone' },
    ]}
    formFields={[
      { key: 'patient_id', label: 'Patient ID', type: 'number' },
      { key: 'recall_date', label: 'Recall Date', type: 'date' },
      { key: 'recall_type', label: 'Recall Type', type: 'select', options: [
        'Annual Eye Exam', 'Contact Lens Follow-up', 'Glaucoma Check',
        'Diabetic Eye Exam', 'Post-Op Follow-up', 'Prescription Recheck',
        'Dry Eye Follow-up', 'Pediatric Vision Check',
      ]},
      { key: 'reason', label: 'Reason', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'pending', label: 'Pending' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'completed', label: 'Completed' },
      ]},
      { key: 'contact_method', label: 'Contact Method', type: 'select', options: [
        { value: '', label: '-- Select --' },
        { value: 'phone', label: 'Phone' },
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
        { value: 'mail', label: 'Mail' },
      ]},
      { key: 'contacted_date', label: 'Contacted Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]}
  />
);

/* ------------------------------------------------------------------ */
/*  Reports & Analytics Page                                           */
/* ------------------------------------------------------------------ */
const ReportsPage = () => {
  const [revenue, setRevenue] = useState([]);
  const [apptStats, setApptStats] = useState(null);
  const [demographics, setDemographics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [rev, appts, demo] = await Promise.allSettled([
          api.getRevenueReport(),
          api.getAppointmentStats(),
          api.getPatientDemographics(),
        ]);
        setRevenue(rev.status === 'fulfilled' && Array.isArray(rev.value) ? rev.value : []);
        setApptStats(appts.status === 'fulfilled' ? appts.value : null);
        setDemographics(demo.status === 'fulfilled' ? demo.value : null);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="loading-container"><Loader className="spinner" size={40} /></div>;

  const maxRevenue = Math.max(...revenue.map(r => parseFloat(r.total_billed) || 0), 1);
  const maxApptMonth = apptStats?.by_month ? Math.max(...apptStats.by_month.map(m => parseInt(m.total) || 0), 1) : 1;

  return (
    <div className="reports-page">
      <div className="resource-header">
        <div className="resource-title">
          <BarChart3 size={28} />
          <h1>Reports & Analytics</h1>
        </div>
      </div>

      <div className="report-tabs">
        <button className={`report-tab ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>
          <DollarSign size={18} /> Revenue
        </button>
        <button className={`report-tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
          <Calendar size={18} /> Appointments
        </button>
        <button className={`report-tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
          <Users size={18} /> Patients
        </button>
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="report-content">
          <div className="report-card">
            <h3>Monthly Revenue (Last 12 Months)</h3>
            {revenue.length === 0 ? (
              <p className="panel-empty">No billing data available yet.</p>
            ) : (
              <>
                <div className="chart-container">
                  {revenue.map((row) => (
                    <div key={row.month} className="bar-group">
                      <div className="bar-wrapper">
                        <div
                          className="bar bar-billed"
                          style={{ height: `${(parseFloat(row.total_billed) / maxRevenue) * 100}%` }}
                          title={`Billed: $${parseFloat(row.total_billed).toLocaleString()}`}
                        />
                        <div
                          className="bar bar-collected"
                          style={{ height: `${(parseFloat(row.total_collected) / maxRevenue) * 100}%` }}
                          title={`Collected: $${parseFloat(row.total_collected).toLocaleString()}`}
                        />
                      </div>
                      <span className="bar-label">{row.month.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <span><span className="legend-dot" style={{ background: 'var(--primary)' }} /> Billed</span>
                  <span><span className="legend-dot" style={{ background: 'var(--success)' }} /> Collected</span>
                </div>
                <div className="table-container" style={{ marginTop: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Total Billed</th>
                        <th>Collected</th>
                        <th>Insurance</th>
                        <th>Patient</th>
                        <th>Invoices</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.map((row) => (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td>${parseFloat(row.total_billed).toLocaleString()}</td>
                          <td>${parseFloat(row.total_collected).toLocaleString()}</td>
                          <td>${parseFloat(row.insurance_total).toLocaleString()}</td>
                          <td>${parseFloat(row.patient_total).toLocaleString()}</td>
                          <td>{row.invoice_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && apptStats && (
        <div className="report-content">
          <div className="report-row">
            <div className="report-card report-card-half">
              <h3>By Type</h3>
              {apptStats.by_type?.length === 0 ? (
                <p className="panel-empty">No appointment data.</p>
              ) : (
                <div className="stat-bars">
                  {apptStats.by_type?.map((row) => {
                    const maxType = Math.max(...apptStats.by_type.map(r => parseInt(r.count)), 1);
                    return (
                      <div key={row.appointment_type} className="stat-bar-row">
                        <span className="stat-bar-label">{row.appointment_type || 'Other'}</span>
                        <div className="stat-bar-track">
                          <div className="stat-bar-fill" style={{ width: `${(parseInt(row.count) / maxType) * 100}%` }} />
                        </div>
                        <span className="stat-bar-value">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="report-card report-card-half">
              <h3>By Status</h3>
              {apptStats.by_status?.length === 0 ? (
                <p className="panel-empty">No appointment data.</p>
              ) : (
                <div className="status-grid">
                  {apptStats.by_status?.map((row) => (
                    <div key={row.status} className="status-stat">
                      <span className={`badge badge-${row.status === 'completed' ? 'success' : row.status === 'cancelled' ? 'danger' : row.status === 'no-show' ? 'warning' : 'info'}`} style={{ fontSize: '1.5rem', padding: '0.5rem 1rem' }}>
                        {row.count}
                      </span>
                      <span className="status-label">{row.status || 'scheduled'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="report-card">
            <h3>Monthly Appointments</h3>
            {apptStats.by_month?.length === 0 ? (
              <p className="panel-empty">No monthly data.</p>
            ) : (
              <div className="chart-container">
                {apptStats.by_month?.map((row) => (
                  <div key={row.month} className="bar-group">
                    <div className="bar-wrapper">
                      <div
                        className="bar bar-billed"
                        style={{ height: `${(parseInt(row.total) / maxApptMonth) * 100}%` }}
                        title={`Total: ${row.total}`}
                      />
                    </div>
                    <span className="bar-label">{row.month.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && demographics && (
        <div className="report-content">
          <div className="report-row">
            <div className="report-card report-card-half">
              <h3>Age Distribution</h3>
              {demographics.age_groups?.length === 0 ? (
                <p className="panel-empty">No patient data with dates of birth.</p>
              ) : (
                <div className="stat-bars">
                  {demographics.age_groups?.map((row) => {
                    const maxAge = Math.max(...demographics.age_groups.map(r => parseInt(r.count)), 1);
                    return (
                      <div key={row.age_group} className="stat-bar-row">
                        <span className="stat-bar-label">{row.age_group}</span>
                        <div className="stat-bar-track">
                          <div className="stat-bar-fill stat-bar-accent" style={{ width: `${(parseInt(row.count) / maxAge) * 100}%` }} />
                        </div>
                        <span className="stat-bar-value">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="report-card report-card-half">
              <h3>Most Active Patients</h3>
              {demographics.top_patients?.length === 0 ? (
                <p className="panel-empty">No patient activity data.</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Appointments</th>
                        <th>Prescriptions</th>
                        <th>Last Visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demographics.top_patients?.map((row) => (
                        <tr key={row.id}>
                          <td>{row.first_name} {row.last_name}</td>
                          <td>{row.appointment_count}</td>
                          <td>{row.prescription_count}</td>
                          <td>{row.last_visit?.split('T')[0] || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Prescription Print View                                            */
/* ------------------------------------------------------------------ */
const PrescriptionPrint = ({ prescription, patient, onClose }) => {
  const printRef = React.useRef();

  const handlePrint = () => {
    const content = printRef.current;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Prescription</title>
      <style>
        body { font-family: 'Georgia', serif; max-width: 700px; margin: 2rem auto; color: #1a1a1a; }
        .rx-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .rx-header h1 { font-size: 1.5rem; margin: 0; }
        .rx-header p { margin: 0.25rem 0; color: #555; font-size: 0.9rem; }
        .rx-patient { display: flex; justify-content: space-between; margin-bottom: 1.5rem; padding: 0.75rem; background: #f5f5f5; border-radius: 6px; }
        .rx-symbol { font-size: 2rem; font-weight: bold; color: #2563eb; margin: 1rem 0; }
        .rx-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .rx-table th, .rx-table td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: center; }
        .rx-table th { background: #f0f4ff; font-weight: 600; }
        .rx-notes { margin-top: 1.5rem; padding: 0.75rem; border: 1px dashed #ccc; border-radius: 6px; }
        .rx-footer { margin-top: 2rem; display: flex; justify-content: space-between; align-items: flex-end; }
        .rx-signature { border-top: 1px solid #333; width: 250px; text-align: center; padding-top: 0.25rem; color: #555; }
        @media print { body { margin: 1cm; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Printer size={20} /> Print Prescription</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        <div className="modal-body" ref={printRef}>
          <div className="rx-preview">
            <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Optical Prescription</h2>
              <p style={{ margin: '0.25rem 0', color: '#555' }}>AI Optometry Practice</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '6px' }}>
              <div>
                <strong>Patient:</strong> {patient || 'N/A'}
              </div>
              <div>
                <strong>Date:</strong> {prescription.exam_date?.split('T')[0] || '--'}
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb', margin: '1rem 0' }}>Rx</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1rem 0' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f4ff' }}>Eye</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f4ff' }}>Sphere (SPH)</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f4ff' }}>Cylinder (CYL)</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f4ff' }}>Axis</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem', background: '#f0f4ff' }}>ADD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', fontWeight: 'bold' }}>OD (Right)</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.right_sphere ?? '--'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.right_cylinder ?? '--'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.right_axis ?? '--'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.right_add ?? '--'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', fontWeight: 'bold' }}>OS (Left)</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.left_sphere ?? '--'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.left_cylinder ?? '--'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.left_axis ?? '--'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>{prescription.left_add ?? '--'}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0' }}>
              <div><strong>PD:</strong> {prescription.pd ?? '--'} mm</div>
            </div>
            {prescription.notes && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed #ccc', borderRadius: '6px' }}>
                <strong>Notes:</strong> {prescription.notes}
              </div>
            )}
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <strong>Valid for 1 year from exam date</strong>
              </div>
              <div style={{ borderTop: '1px solid #333', width: '250px', textAlign: 'center', paddingTop: '0.25rem', color: '#555' }}>
                Doctor's Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Enhanced Prescriptions Page (with Print)                           */
/* ------------------------------------------------------------------ */
const PrescriptionsPageEnhanced = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printItem, setPrintItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const columns = [
    {
      key: 'patient_name', label: 'Patient',
      render: (_val, item) => {
        if (item.patient_name) return item.patient_name;
        if (item.first_name || item.last_name) return `${item.first_name || ''} ${item.last_name || ''}`.trim();
        return item.patient_id || '--';
      },
    },
    { key: 'exam_date', label: 'Exam Date', render: (val) => val?.split('T')[0] || '--' },
    { key: 'right_sphere', label: 'OD Sphere' },
    { key: 'left_sphere', label: 'OS Sphere' },
    { key: 'pd', label: 'PD' },
  ];

  const formFields = [
    { key: 'patient_id', label: 'Patient ID', type: 'number' },
    { key: 'exam_date', label: 'Exam Date', type: 'date' },
    { key: 'right_sphere', label: 'OD Sphere', type: 'number', step: '0.25' },
    { key: 'right_cylinder', label: 'OD Cylinder', type: 'number', step: '0.25' },
    { key: 'right_axis', label: 'OD Axis', type: 'number' },
    { key: 'right_add', label: 'OD ADD', type: 'number', step: '0.25' },
    { key: 'left_sphere', label: 'OS Sphere', type: 'number', step: '0.25' },
    { key: 'left_cylinder', label: 'OS Cylinder', type: 'number', step: '0.25' },
    { key: 'left_axis', label: 'OS Axis', type: 'number' },
    { key: 'left_add', label: 'OS ADD', type: 'number', step: '0.25' },
    { key: 'pd', label: 'PD (mm)', type: 'number', step: '0.5' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.getAll('prescriptions');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;
    await api.delete('prescriptions', id);
    fetchItems();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.id) {
      await api.update('prescriptions', formData.id, formData);
    } else {
      await api.create('prescriptions', formData);
    }
    setShowForm(false);
    setFormData({});
    fetchItems();
  };

  const handleAiAction = async (item) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api.aiPrescriptionTrends(item);
      setAiResult(result);
    } catch {
      setAiResult({ error: 'AI analysis failed. Please try again.' });
    } finally {
      setAiLoading(false);
    }
  };

  const filteredItems = items.filter((item) =>
    Object.values(item).some(
      (val) => typeof val === 'string' && val.toLowerCase().includes(search.toLowerCase())
    )
  );

  const getPatientName = (item) => {
    if (item.first_name || item.last_name) return `${item.first_name || ''} ${item.last_name || ''}`.trim();
    return `Patient #${item.patient_id}`;
  };

  const getAiMarkdown = (result) => {
    if (!result) return null;
    if (result.error) return null;
    if (typeof result === 'string') return result;
    if (result.analysis) return result.analysis;
    if (result.recommendations) return result.recommendations;
    const strVal = Object.values(result).find((v) => typeof v === 'string' && v.length > 20);
    if (strVal) return strVal;
    return JSON.stringify(result, null, 2);
  };

  return (
    <div className="resource-page">
      <div className="resource-header">
        <div className="resource-title">
          <FileText size={28} />
          <h1>Prescriptions</h1>
          <span className="badge badge-info">{items.length} total</span>
        </div>
        <div className="resource-actions">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Search prescriptions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setFormData({}); setShowForm(true); }}>
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><Loader className="spinner" size={40} /></div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No prescriptions found</h3>
          <p>Get started by adding your first record.</p>
          <button className="btn btn-primary" onClick={() => { setFormData({}); setShowForm(true); }}>
            <Plus size={18} /> Add Prescription
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => <th key={col.key}>{col.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setShowModal(true); setAiResult(null); }} style={{ cursor: 'pointer' }}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(item[col.key], item) : item[col.key] ?? '--'}</td>
                  ))}
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm btn-outline" onClick={() => { setSelectedItem(item); setShowModal(true); setAiResult(null); }} title="View details">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => { setPrintItem(item); setShowPrint(true); }} title="Print Prescription">
                        <Printer size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => { setFormData(item); setShowForm(true); }} title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                      <button className="btn btn-sm btn-accent" onClick={() => { setSelectedItem(item); setShowModal(true); handleAiAction(item); }} title="AI Analyze">
                        <Brain size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Prescription Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(selectedItem)
                  .filter(([key]) => key !== '__v' && key !== 'created_at' && key !== 'updated_at')
                  .map(([key, value]) => (
                    <div className="detail-item" key={key}>
                      <span className="detail-label">{snakeToTitle(key)}</span>
                      <span className="detail-value">{String(value ?? '--')}</span>
                    </div>
                  ))}
              </div>
              {aiLoading && (
                <div className="ai-loading"><Loader className="spinner" size={24} /><span>AI is analyzing...</span></div>
              )}
              {aiResult && (
                <div className="ai-result-card">
                  <div className="ai-result-header"><Brain size={20} /><h3>AI Analysis</h3></div>
                  <div className="ai-result-body">
                    {aiResult.error ? (
                      <div className="ai-error"><AlertTriangle size={18} /><span>{aiResult.error}</span></div>
                    ) : (
                      <div className="ai-output">{renderMarkdown(getAiMarkdown(aiResult))}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formData.id ? 'Edit' : 'Add New'} Prescription</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                {formFields.map((field) => (
                  <div className="form-group" key={field.key}>
                    <label>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea value={formData[field.key] || ''} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} rows={3} />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
                        step={field.step}
                      />
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><CheckCircle size={18} /> {formData.id ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrint && printItem && (
        <PrescriptionPrint
          prescription={printItem}
          patient={getPatientName(printItem)}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  App root                                                           */
/* ------------------------------------------------------------------ */
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/patients" element={<PatientsPage />} />
                  <Route path="/retinal-scans" element={<RetinalScansPage />} />
                  <Route path="/prescriptions" element={<PrescriptionsPageEnhanced />} />
                  <Route path="/frames" element={<FramesPage />} />
                  <Route path="/insurance" element={<InsurancePage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/appointments" element={<AppointmentsPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/contact-lenses" element={<ContactLensesPage />} />
                  <Route path="/visual-acuity" element={<VisualAcuityPage />} />
                  <Route path="/recalls" element={<RecallsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
