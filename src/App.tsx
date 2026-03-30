import React, { useState, useEffect } from 'react';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(50000);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');

  // 🔥 👉 PUT YOUR REAL RENDER BACKEND URL HERE
  const BACKEND = "https://finvibe-ai-financial-tracker.onrender.com";

  // Load data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        fetch(`${BACKEND}/api/transactions`),
        fetch(`${BACKEND}/api/budget`)
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        setTransactions(tData);
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        setBudget(bData.amount);
      }

    } catch (e) {
      console.error("Fetch error:", e);
      alert("Backend not responding ❌");
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();

    if (!amount || !description || !category) {
      alert("Fill all fields");
      return;
    }

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
        setTransactions(prev => [newT, ...prev]);

        setAmount('');
        setDescription('');
        setCategory('');
      } else {
        alert("Failed to add transaction");
      }
    } catch (e) {
      console.error("Add error:", e);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const res = await fetch(`${BACKEND}/api/transactions/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const updateBudget = async (val) => {
    setBudget(val);

    try {
      await fetch(`${BACKEND}/api/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: val })
      });
    } catch (e) {
      console.error("Budget update error:", e);
    }
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

      {transactions.length === 0 ? (
        <p>No transactions yet</p>
      ) : (
        transactions.map((t) => (
          <div key={t.id} style={{
            border: "1px solid #ccc",
            padding: 10,
            margin: 5
          }}>
            <b>{t.description}</b> - ₹{t.amount} ({t.category})
            <button
              onClick={() => deleteTransaction(t.id)}
              style={{ marginLeft: 10 }}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}