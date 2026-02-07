import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './styles.css';
import { useExpenses, useSettings, defaultCategories, defaultUsers } from './db';

const ExpenseForm = () => {
  const dateInputRef = useRef(null);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expenseBy, setExpenseBy] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const { categories, users, loading: settingsLoading } = useSettings();
  const { addExpense, error: saveError } = useExpenses();

  useEffect(() => {
    if (!snackbar) return;
    const t = setTimeout(() => setSnackbar(null), 3000);
    return () => clearTimeout(t);
  }, [snackbar]);

  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker?.();
    } catch (_) {
      /* showPicker requires user gesture; ignore */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addExpense({ date, description, category, expenseBy, amount: parseFloat(amount) });
      setAmount('');
      setSnackbar('Expense added');
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h2>Add Expense</h2>
      {saveError && <p className="error-msg">{saveError}</p>}
      <form onSubmit={handleSubmit} className="form form--add">
        <div className="form-row form-row--2">
          <div className="field">
            <label>Date</label>
            <input ref={dateInputRef} type="date" className="input-date" value={date} onChange={(e) => setDate(e.target.value)} onClick={openDatePicker} required />
          </div>
          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" step="0.01" />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <input type="text" placeholder="What was it for?" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="form-row form-row--2">
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">Select category</option>
              {categories.map((cat, i) => <option key={i}>{cat}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Expense by</label>
            <select value={expenseBy} onChange={(e) => setExpenseBy(e.target.value)} required>
              <option value="">Who paid?</option>
              {users.map((user, i) => <option key={i}>{user}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save expense'}</button>
      </form>
      {snackbar && <div className="snackbar" role="status">{snackbar}</div>}
    </div>
  );
};

const ManageCategories = () => {
  const [newCategory, setNewCategory] = useState('');
  const { categories, setCategories, loading } = useSettings();

  const addCategory = async () => {
    if (!newCategory.trim() || categories.includes(newCategory)) return;
    const updated = [...categories, newCategory.trim()];
    await setCategories(updated);
    setNewCategory('');
  };

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h2>Manage Categories</h2>
      <div className="categories-add-block">
        <div className="categories-add">
          <div className="field">
            <label>New category</label>
            <input
              type="text"
              className="input input--category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Travel, Subscriptions"
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={addCategory}>Add category</button>
        </div>
      </div>
      <ul className="category-list">
        {categories.map((cat, i) => <li key={i}>{cat}</li>)}
      </ul>
    </div>
  );
};

const ExpenseList = () => {
  const dateFilterRef = useRef(null);
  const monthFilterRef = useRef(null);
  const { expenses, loading: expensesLoading } = useExpenses();
  const { categories, users } = useSettings();
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [expenseByFilter, setExpenseByFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedMonths, setCollapsedMonths] = useState(() => new Set());

  const openDateFilterPicker = () => {
    try {
      dateFilterRef.current?.showPicker?.();
    } catch (_) {}
  };
  const openMonthFilterPicker = () => {
    try {
      monthFilterRef.current?.showPicker?.();
    } catch (_) {}
  };

  const toggleMonth = (monthKey) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const toggleCategory = (cat) => {
    setCategoryFilter(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearCategoryFilter = () => setCategoryFilter([]);

  const filtered = expenses
    .filter(e =>
      (!categoryFilter.length || categoryFilter.includes(e.category)) &&
      (!dateFilter || e.date === dateFilter) &&
      (!monthFilter || e.date.startsWith(monthFilter)) &&
      (!expenseByFilter || e.expenseBy === expenseByFilter) &&
      (!searchQuery.trim() || (e.description || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const byMonth = filtered.reduce((acc, exp) => {
    const key = exp.date ? exp.date.slice(0, 7) : '';
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});
  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  if (expensesLoading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h2>Expense List</h2>
      <div className="filters">
        <div className="filter-group search-field-wrap">
          <label>Search</label>
          <div className="search-field">
            <input
              type="search"
              className="input input--search"
              placeholder="Search in description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search in description"
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Category</label>
          <div className="category-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${categoryFilter.includes(cat) ? 'chip--selected' : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            ))}
            {categoryFilter.length > 0 && (
              <button type="button" className="chip chip--clear" onClick={clearCategoryFilter}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="filter-row">
          <div className="filter-field">
            <label>Date</label>
            <input ref={dateFilterRef} type="date" className="input-date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} onClick={openDateFilterPicker} />
          </div>
          <div className="filter-field">
            <label>Month</label>
            <input ref={monthFilterRef} type="month" className="input-date" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} onClick={openMonthFilterPicker} />
          </div>
          <div className="filter-field">
            <label>Expense by</label>
        <select value={expenseByFilter} onChange={(e) => setExpenseByFilter(e.target.value)}>
          <option value="">All</option>
          {users.map((user, i) => <option key={i}>{user}</option>)}
        </select>
          </div>
        </div>
      </div>
      {monthKeys.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">{expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}</p>
          <p className="empty-state-desc">
            {expenses.length === 0 ? 'Add your first expense from the Add page.' : 'Try clearing the search or filters above.'}
          </p>
        </div>
      ) : (
      <ul className="expense-list">
        {monthKeys.map((monthKey) => {
          const items = byMonth[monthKey];
          const monthLabel = new Date(monthKey + '-01T12:00:00').toLocaleString('default', { month: 'long', year: 'numeric' });
          const isCollapsed = collapsedMonths.has(monthKey);
          const monthTotal = items.reduce((s, e) => s + e.amount, 0);
          return (
            <React.Fragment key={monthKey}>
              <li className="expense-list-separator">
                <button
                  type="button"
                  className="expense-list-separator-btn"
                  onClick={() => toggleMonth(monthKey)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="expense-list-separator-chevron" aria-hidden="true">▼</span>
                  <span className="expense-list-separator-label">{monthLabel}</span>
                  <span className="expense-list-separator-meta">{items.length} items · ₹{monthTotal.toLocaleString('en-IN')}</span>
                </button>
              </li>
              {!isCollapsed && items.map((exp) => (
                <li key={exp.id} className="expense-item">
                  <span className="expense-date">{exp.date}</span>
                  <span className="expense-desc">{exp.description}</span>
                  <span className="expense-cat">{exp.category}</span>
                  <span className="expense-amount">₹{exp.amount}</span>
                  <span className="expense-by">{exp.expenseBy}</span>
                </li>
              ))}
            </React.Fragment>
          );
        })}
      </ul>
      )}
      <div className="total">Total: ₹{total.toLocaleString('en-IN')}</div>
    </div>
  );
};

const formatMonth = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString('default', { month: 'short', year: 'numeric' });
};

const formatMonthKey = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : dateStr.slice(0, 7);
};

const groupBy = (arr, keyFn) => {
  return arr.reduce((acc, item) => {
    const key = keyFn(item.date);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
};

const groupAndSumByCategory = (group) => Object.entries(group).map(([period, items]) => {
  const categoryGroup = items.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});
  const categorySums = Object.entries(categoryGroup).map(([cat, list]) => ({
    category: cat,
    total: list.reduce((sum, e) => sum + e.amount, 0),
  }));
  return { period, categorySums };
});

const ReportIndex = () => (
  <div className="container">
    <h2>Reports</h2>
    <p className="report-desc">Choose a report to view.</p>
    <div className="report-cards">
      <Link to="/report/monthly" className="report-card">
        <h3>Monthly by category</h3>
        <p>Total spent per category for each month.</p>
      </Link>
      <Link to="/report/by-person" className="report-card">
        <h3>Category × Month × Person</h3>
        <p>Total spend per category, per month, per person.</p>
      </Link>
      <Link to="/report/person-summary" className="report-card">
        <h3>Person-wise summary</h3>
        <p>Total spent by each person, overall and per month.</p>
      </Link>
      <Link to="/report/category-breakdown" className="report-card">
        <h3>Category breakdown</h3>
        <p>Totals per category with %. Filter by month or all time.</p>
      </Link>
      <Link to="/report/date-range" className="report-card">
        <h3>Date range</h3>
        <p>Pick from/to dates and see summary and list for that range.</p>
      </Link>
    </div>
  </div>
);

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ec4899', '#14b8a6'];

const formatMonthLabel = (monthKey) => new Date(monthKey + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });

const Dashboard = () => {
  const { expenses, loading } = useExpenses();
  const { users, categories } = useSettings();

  const byUser = expenses.reduce((acc, e) => {
    const p = e.expenseBy || '';
    acc[p] = (acc[p] || 0) + e.amount;
    return acc;
  }, {});

  const byUserMonth = expenses.reduce((acc, e) => {
    const p = e.expenseBy || '';
    const m = e.date ? e.date.slice(0, 7) : '';
    if (!m) return acc;
    if (!acc[m]) acc[m] = {};
    acc[m][p] = (acc[m][p] || 0) + e.amount;
    return acc;
  }, {});

  const byCategory = expenses.reduce((acc, e) => {
    const c = e.category || 'Other';
    acc[c] = (acc[c] || 0) + e.amount;
    return acc;
  }, {});

  const byCategoryMonth = expenses.reduce((acc, e) => {
    const c = e.category || 'Other';
    const m = e.date ? e.date.slice(0, 7) : '';
    if (!m) return acc;
    if (!acc[m]) acc[m] = {};
    acc[m][c] = (acc[m][c] || 0) + e.amount;
    return acc;
  }, {});

  const byCategoryUserMonth = expenses.reduce((acc, e) => {
    const c = e.category || 'Other';
    const p = e.expenseBy || '';
    const m = e.date ? e.date.slice(0, 7) : '';
    if (!m) return acc;
    if (!acc[c]) acc[c] = {};
    if (!acc[c][m]) acc[c][m] = {};
    acc[c][m][p] = (acc[c][m][p] || 0) + e.amount;
    return acc;
  }, {});

  const allMonths = [...new Set(expenses.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort();

  const chart1Data = users.map(u => ({ name: u, value: byUser[u] || 0 })).filter(d => d.value > 0);
  const chart2Data = allMonths.map(m => {
    const row = { month: formatMonthLabel(m) };
    users.forEach(u => { row[u] = byUserMonth[m]?.[u] || 0; });
    return row;
  }).reverse();
  const chart3Data = Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const categoryKeys = Object.keys(byCategory);
  const chart4Data = allMonths.map(m => {
    const row = { month: formatMonthLabel(m) };
    categoryKeys.forEach(c => { row[c] = byCategoryMonth[m]?.[c] || 0; });
    return row;
  }).reverse();
  const chart5ByCategory = Object.keys(byCategoryUserMonth).map(cat => {
    const months = Object.keys(byCategoryUserMonth[cat] || {}).sort();
    const data = months.map(m => {
      const row = { month: formatMonthLabel(m) };
      users.forEach(u => { row[u] = byCategoryUserMonth[cat][m]?.[u] || 0; });
      return row;
    }).reverse();
    return { category: cat, data };
  });

  const tooltipFormatter = (v) => ['₹' + Number(v).toLocaleString('en-IN'), ''];

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container dashboard">
      <h2>Dashboard</h2>
      <p className="report-desc">Charts for spending by user, category, and time.</p>

      {chart1Data.length > 0 && (
        <section className="dashboard-section">
          <h3>Total spend by each user</h3>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart1Data} layout="vertical" margin={{ left: 80, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={(v) => '₹' + v} />
                <YAxis type="category" dataKey="name" width={72} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="value" fill={CHART_COLORS[0]} name="Amount" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {chart2Data.length > 0 && users.length > 0 && (
        <section className="dashboard-section">
          <h3>Total spend by each user each month</h3>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chart2Data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => '₹' + v} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                {users.map((u, i) => (
                  <Bar key={u} dataKey={u} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} name={u} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {chart3Data.length > 0 && (
        <section className="dashboard-section">
          <h3>Total spend on each category</h3>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart3Data} layout="vertical" margin={{ left: 80, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={(v) => '₹' + v} />
                <YAxis type="category" dataKey="name" width={72} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="value" fill={CHART_COLORS[1]} name="Amount" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {chart4Data.length > 0 && categoryKeys.length > 0 && (
        <section className="dashboard-section">
          <h3>Total spend on each category each month</h3>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chart4Data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => '₹' + v} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                {categoryKeys.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="b" fill={CHART_COLORS[i % CHART_COLORS.length]} name={c} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {chart5ByCategory.filter(({ data }) => data.length > 0).length > 0 && (
        <section className="dashboard-section">
          <h3>Total spend on each category by each user each month</h3>
          {chart5ByCategory.filter(({ data }) => data.length > 0).map(({ category, data }) => (
            <div key={category} className="dashboard-subsection">
              <h4>{category}</h4>
              <div className="dashboard-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => '₹' + v} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend />
                    {users.map((u, i) => (
                      <Bar key={u} dataKey={u} stackId="c" fill={CHART_COLORS[i % CHART_COLORS.length]} name={u} radius={[0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </section>
      )}

      {expenses.length === 0 && (
        <p className="report-empty">No expenses yet. Add some to see charts.</p>
      )}
    </div>
  );
};

const MonthlyReportPage = () => {
  const { expenses, loading } = useExpenses();
  const monthGroups = groupBy(expenses, formatMonth);
  const monthReport = groupAndSumByCategory(monthGroups);

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <NavLink to="/report" className="report-back">← Reports</NavLink>
      <h2>Monthly expense by category</h2>
      <p className="report-desc">Total spent per category for each month.</p>
      {monthReport.length === 0 ? (
        <p className="report-empty">No expenses yet.</p>
      ) : (
        monthReport.map(({ period, categorySums }) => (
          <div key={period} className="report-box">
            <strong>{period}</strong>
            <ul>
              {categorySums.map(({ category, total }, i) => (
                <li key={i}>{category}: ₹{total.toLocaleString('en-IN')}</li>
              ))}
              <li className="report-box-total">
                Total: ₹{categorySums.reduce((s, { total }) => s + total, 0).toLocaleString('en-IN')}
              </li>
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

const CategoryPersonReportPage = () => {
  const { expenses, loading } = useExpenses();
  const { users } = useSettings();

  const categoryMonthPerson = expenses.reduce((acc, e) => {
    const monthKey = formatMonthKey(e.date);
    const monthLabel = formatMonth(e.date);
    if (!acc[e.category]) acc[e.category] = {};
    if (!acc[e.category][monthKey]) acc[e.category][monthKey] = { monthLabel, byPerson: {} };
    const byPerson = acc[e.category][monthKey].byPerson;
    byPerson[e.expenseBy] = (byPerson[e.expenseBy] || 0) + e.amount;
    return acc;
  }, {});

  const categoryMonthPersonList = Object.entries(categoryMonthPerson).map(([category, months]) => {
    const monthEntries = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, { monthLabel, byPerson }]) => ({
        monthKey,
        monthLabel,
        byPerson: users.map((u) => ({ person: u, amount: byPerson[u] || 0 })),
        total: Object.values(byPerson).reduce((s, n) => s + n, 0),
      }));
    return { category, monthEntries };
  });

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <NavLink to="/report" className="report-back">← Reports</NavLink>
      <h2>Category × Month × Person</h2>
      <p className="report-desc">Total spend per category, per month, per person.</p>
      {categoryMonthPersonList.length === 0 ? (
        <p className="report-empty">No expenses yet.</p>
      ) : (
        categoryMonthPersonList.map(({ category, monthEntries }) => (
          <div key={category} className="report-box report-box--category">
            <strong className="report-category-title">{category}</strong>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    {users.map((u) => (
                      <th key={u}>{u}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthEntries.map(({ monthKey, monthLabel, byPerson, total }) => (
                    <tr key={monthKey}>
                      <td>{monthLabel}</td>
                      {byPerson.map(({ person, amount }) => (
                        <td key={person}>₹{amount.toLocaleString('en-IN')}</td>
                      ))}
                      <td className="report-cell-total">₹{total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const PersonSummaryReportPage = () => {
  const { expenses, loading } = useExpenses();
  const { users } = useSettings();
  const byPerson = expenses.reduce((acc, e) => {
    const p = e.expenseBy || '';
    acc[p] = (acc[p] || 0) + e.amount;
    return acc;
  }, {});
  const byPersonMonth = expenses.reduce((acc, e) => {
    const p = e.expenseBy || '';
    const m = e.date ? e.date.slice(0, 7) : '';
    if (!m) return acc;
    if (!acc[p]) acc[p] = {};
    acc[p][m] = (acc[p][m] || 0) + e.amount;
    return acc;
  }, {});
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <NavLink to="/report" className="report-back">← Reports</NavLink>
      <h2>Person-wise summary</h2>
      <p className="report-desc">Total spent by each person.</p>
      {expenses.length === 0 ? (
        <p className="report-empty">No expenses yet.</p>
      ) : (
        <>
          <div className="report-box">
            <strong>Overall</strong>
            <ul>
              {users.map(u => (
                <li key={u}>{u}: ₹{(byPerson[u] || 0).toLocaleString('en-IN')}</li>
              ))}
              <li className="report-box-total">Total: ₹{totalAll.toLocaleString('en-IN')}</li>
            </ul>
          </div>
          <h3>By month</h3>
          {Object.entries(byPersonMonth).length === 0 ? null : (
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    {users.map(u => <th key={u}>{u}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const months = [...new Set(expenses.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
                    return months.map(monthKey => {
                      const label = new Date(monthKey + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
                      const rowTotal = users.reduce((s, u) => s + (byPersonMonth[u]?.[monthKey] || 0), 0);
                      return (
                        <tr key={monthKey}>
                          <td>{label}</td>
                          {users.map(u => <td key={u}>₹{(byPersonMonth[u]?.[monthKey] || 0).toLocaleString('en-IN')}</td>)}
                          <td className="report-cell-total">₹{rowTotal.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const CategoryBreakdownReportPage = () => {
  const { expenses, loading } = useExpenses();
  const [monthFilter, setMonthFilter] = useState('');
  const data = expenses
    .filter(e => !monthFilter || (e.date && e.date.startsWith(monthFilter)))
    .reduce((acc, e) => {
      const c = e.category || 'Other';
      acc[c] = (acc[c] || 0) + e.amount;
      return acc;
    }, {});
  const total = Object.values(data).reduce((s, n) => s + n, 0);
  const tableData = Object.entries(data)
    .map(([name, value]) => ({ name, value, pct: total ? ((value / total) * 100).toFixed(1) : '0' }))
    .sort((a, b) => b.value - a.value);

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <NavLink to="/report" className="report-back">← Reports</NavLink>
      <h2>Category breakdown</h2>
      <p className="report-desc">Totals per category with share of total.</p>
      <div className="report-actions filter-row">
        <div className="filter-field">
          <label>Month (optional)</label>
          <input type="month" className="input-date" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
        </div>
      </div>
      {tableData.length === 0 ? (
        <p className="report-empty">No expenses for this period.</p>
      ) : (
        <div className="report-box">
          <strong>Total: ₹{total.toLocaleString('en-IN')}</strong>
          <ul>
            {tableData.map((d) => (
              <li key={d.name}>{d.name}: ₹{d.value.toLocaleString('en-IN')} ({d.pct}%)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const DateRangeReportPage = () => {
  const { expenses, loading } = useExpenses();
  const { users } = useSettings();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filtered = expenses.filter(e => {
    if (!e.date) return false;
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const byCategory = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const byPerson = filtered.reduce((acc, e) => {
    acc[e.expenseBy] = (acc[e.expenseBy] || 0) + e.amount;
    return acc;
  }, {});

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <NavLink to="/report" className="report-back">← Reports</NavLink>
      <h2>Date range report</h2>
      <p className="report-desc">Pick from and to dates to see summary and list.</p>
      <div className="report-actions filter-row">
        <div className="filter-field">
          <label>From</label>
          <input type="date" className="input-date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="filter-field">
          <label>To</label>
          <input type="date" className="input-date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="report-empty">No expenses in this date range. Set From/To and try again.</p>
      ) : (
        <>
          <div className="report-box">
            <strong>Summary</strong>
            <p>Total: ₹{total.toLocaleString('en-IN')} ({filtered.length} expenses)</p>
            <p><strong>By category:</strong> {Object.entries(byCategory).map(([c, v]) => `${c} ₹${v.toLocaleString('en-IN')}`).join(' · ')}</p>
            <p><strong>By person:</strong> {users.map(u => `${u} ₹${(byPerson[u] || 0).toLocaleString('en-IN')}`).join(' · ')}</p>
          </div>
          <h3>List</h3>
          <ul className="expense-list">
            {filtered.map(exp => (
              <li key={exp.id} className="expense-item">
                <span className="expense-date">{exp.date}</span>
                <span className="expense-desc">{exp.description}</span>
                <span className="expense-cat">{exp.category}</span>
                <span className="expense-amount">₹{exp.amount}</span>
                <span className="expense-by">{exp.expenseBy}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const NAV_ORDER = ['/', '/list', '/categories', '/dashboard', '/report'];
const SWIPE_THRESHOLD = 60;

const MainWithSwipeNav = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStart = useRef({ x: 0, y: 0 });

  const getCurrentIndex = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path.startsWith('/list')) return 1;
    if (path.startsWith('/categories')) return 2;
    if (path.startsWith('/dashboard')) return 3;
    if (path.startsWith('/report')) return 4;
    return 0;
  };

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const deltaX = t.clientX - touchStart.current.x;
    const deltaY = t.clientY - touchStart.current.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;
    const index = getCurrentIndex();
    if (deltaX < 0 && index < NAV_ORDER.length - 1) {
      navigate(NAV_ORDER[index + 1]);
    } else if (deltaX > 0 && index > 0) {
      navigate(NAV_ORDER[index - 1]);
    }
  };

  return (
    <main className="main main--swipe" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </main>
  );
};

export default function App() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Router>
      <div className={'app-wrap' + (!isOnline ? ' app-offline' : '')}>
      <nav className="navbar">
        <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>Add</NavLink>
        <NavLink to="/list" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>List</NavLink>
        <NavLink to="/categories" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Categories</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
        <NavLink to="/report" end={false} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Reports</NavLink>
      </nav>
      <MainWithSwipeNav>
      <Routes>
        <Route path="/" element={<ExpenseForm />} />
        <Route path="/categories" element={<ManageCategories />} />
        <Route path="/list" element={<ExpenseList />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<ReportIndex />} />
        <Route path="/report/monthly" element={<MonthlyReportPage />} />
        <Route path="/report/by-person" element={<CategoryPersonReportPage />} />
        <Route path="/report/person-summary" element={<PersonSummaryReportPage />} />
        <Route path="/report/category-breakdown" element={<CategoryBreakdownReportPage />} />
        <Route path="/report/date-range" element={<DateRangeReportPage />} />
      </Routes>
      </MainWithSwipeNav>
      {!isOnline && (
        <div className="offline-overlay" role="alert" aria-live="assertive">
          <p>You&apos;re offline. Connect to the internet to use the app.</p>
        </div>
      )}
      </div>
    </Router>
  );
}
