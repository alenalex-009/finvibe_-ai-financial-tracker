import React, { useState, useEffect } from 'react';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(50000);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');

  const BACKEND = "https://your-backend.onrender.com"; // 🔥 CHANGE THIS

  // 🔥 Auto load data (NO AUTH)
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const tRes = await fetch(`${BACKEND}/api/transactions`);
      const bRes = await fetch(`${BACKEND}/api/budget`);

      if (tRes.ok) setTransactions(await tRes.json());
      if (bRes.ok) {
        const data = await bRes.json();
        setBudget(data.amount);
      }
    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();

    const data = {
      amount: parseFloat(amount),
      description,
      category,
      type,
      date: new Date().toISOString().split("T")[0]
    };

    try {
      const res = await fetch(`${BACKEND}/api/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const newT = await res.json();
        setTransactions([newT, ...transactions]);
        setAmount('');
        setDescription('');
        setCategory('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTransaction = async (id) => {
    await fetch(`${BACKEND}/api/transactions/${id}`, {
      method: "DELETE"
    });

    setTransactions(transactions.filter(t => t.id !== id));
  };

  const updateBudget = async (val) => {
    setBudget(val);

    await fetch(`${BACKEND}/api/budget`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: val })
    });
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>💰 FinVibe (Test Mode)</h1>

      {/* Budget */}
      <div>
        <h2>Budget</h2>
        <input
          type="number"
          value={budget}
          onChange={(e) => updateBudget(Number(e.target.value))}
        />
      </div>

      {/* Add Transaction */}
      <form onSubmit={addTransaction} style={{ marginTop: 20 }}>
        <h2>Add Transaction</h2>

        <input
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <button type="submit">Add</button>
      </form>

      {/* Transactions */}
      <h2 style={{ marginTop: 20 }}>Transactions</h2>

      {transactions.map((t) => (
        <div key={t.id} style={{
          border: "1px solid #ccc",
          padding: 10,
          margin: 5
        }}>
          <b>{t.description}</b> - ₹{t.amount}
          <button
            onClick={() => deleteTransaction(t.id)}
            style={{ marginLeft: 10 }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}