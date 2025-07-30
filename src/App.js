import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './styles.css';

const defaultCategories = ['Grocery', 'Fuel', 'Misc', 'Food'];
const defaultUsers = ['Gaurav', 'Dolly'];

const getLocalData = (key, fallback) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
};

const saveLocalData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const ExpenseForm = () => {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState(() => getLocalData('categories', defaultCategories));

  const handleSubmit = (e) => {
    e.preventDefault();
    const newExpense = { id: Date.now(), date, description, category, amount: parseFloat(amount) };
    const expenses = getLocalData('expenses', []);
    expenses.push(newExpense);
    saveLocalData('expenses', expenses);
    setDate(''); setDescription(''); setCategory(''); setAmount('');
    alert('Expense added');
  };

  return (
    <div className="container">
      <h2>Add Expense</h2>
      <form onSubmit={handleSubmit} className="form">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="">Select Category</option>
          {categories.map((cat, i) => <option key={i}>{cat}</option>)}
        </select>
        <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <button type="submit">Save</button>
      </form>
    </div>
  );
};

const ManageCategories = () => {
  const [categories, setCategories] = useState(() => getLocalData('categories', defaultCategories));
  const [newCategory, setNewCategory] = useState('');

  const addCategory = () => {
    if (!categories.includes(newCategory)) {
      const updated = [...categories, newCategory];
      setCategories(updated);
      saveLocalData('categories', updated);
      setNewCategory('');
    }
  };

  return (
    <div className="container">
      <h2>Manage Categories</h2>
      <div className="form-inline">
        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
        <button onClick={addCategory}>Add</button>
      </div>
      <ul>
        {categories.map((cat, i) => <li key={i}>{cat}</li>)}
      </ul>
    </div>
  );
};

const ExpenseList = () => {
  const [expenses, setExpenses] = useState(() => getLocalData('expenses', []));
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [expenseByFilter, setExpenseByFilter] = useState('');
  const categories = getLocalData('categories', defaultCategories);

  const handleCategoryChange = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setCategoryFilter(options);
  };

  const filtered = expenses
    .filter(e =>
      (!categoryFilter.length || categoryFilter.includes(e.category)) &&
      (!dateFilter || e.date === dateFilter) &&
      (!monthFilter || e.date.startsWith(monthFilter)) &&
      (!expenseByFilter || e.expenseBy === expenseByFilter)
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id); // latest at top

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="container">
      <h2>Expense List</h2>
      <div className="form-inline">
        <select multiple value={categoryFilter} onChange={handleCategoryChange}>
          {categories.map((cat, i) => <option key={i}>{cat}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
        <select value={expenseByFilter} onChange={(e) => setExpenseByFilter(e.target.value)}>
          <option value="">All</option>
          {defaultUsers.map((user, i) => <option key={i}>{user}</option>)}
        </select>
      </div>
      <ul className="list">
        {filtered.map(exp => (
          <li key={exp.id}>
            <strong>{exp.date}</strong> - {exp.description} ({exp.category}) - ₹{exp.amount} <em>by {exp.expenseBy}</em>
          </li>
        ))}
      </ul>
      <div className="total">Total: ₹{total}</div>
    </div>
  );
};

const ReportPage = () => {
  const [expenses] = useState(() => getLocalData('expenses', []));

  const formatMonth = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const formatWeek = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return `${start.toISOString().split('T')[0]}`;
  };

  const groupBy = (arr, keyFn) => {
    return arr.reduce((acc, item) => {
      const key = keyFn(item.date);
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  };


  const groupAndSum = (group) => Object.entries(group).map(([period, items]) => {
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

  const monthGroups = groupBy(expenses, formatMonth);
  const weekGroups = groupBy(expenses, formatWeek);
  const monthReport = groupAndSum(monthGroups);
  const weekReport = groupAndSum(weekGroups);

  return (
    <div className="container">
      <h2>Reports</h2>
      <h3>Monthly</h3>
      {monthReport.map(({ period, categorySums }) => (
        <div key={period} className="report-box">
          <strong>{period}</strong>
          <ul>
            {categorySums.map(({ category, total }, i) => (
              <li key={i}>{category}: ₹{total}</li>
            ))}
          </ul>
        </div>
      ))}
      <h3>Weekly</h3>
      {weekReport.map(({ period, categorySums }) => (
        <div key={period} className="report-box">
          <strong>Week Starting {period}</strong>
          <ul>
            {categorySums.map(({ category, total }, i) => (
              <li key={i}>{category}: ₹{total}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="navbar">
        <Link to="/">Add</Link>
        <Link to="/list">List</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/report">Report</Link>
      </div>
      <Routes>
        <Route path="/" element={<ExpenseForm />} />
        <Route path="/categories" element={<ManageCategories />} />
        <Route path="/list" element={<ExpenseList />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}
