"use client";
import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/currency';

const API = 'http://localhost:5000/api';

export default function AdminProducts() {
  const [form, setForm] = useState({ name: '', description: '', price: '', image: '', sellerId: '', category: '' });
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API}/products/categories`).then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed');
      setMessage('Product created');
      setForm({ name: '', description: '', price: '', image: '', sellerId: '', category: '' });
    } catch (err) {
      setMessage(err.message || 'Error');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Admin - Create Product</h2>
      {message && <div className="mb-4">{message}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2" required />
        <input name="price" value={form.price} onChange={handleChange} placeholder="Price" className="border p-2" required />
        <input name="sellerId" value={form.sellerId} onChange={handleChange} placeholder="Seller ID" className="border p-2" required />
        <select name="category" value={form.category} onChange={handleChange} className="border p-2">
          <option value="">Select category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="border p-2 md:col-span-2" />
        <input name="image" value={form.image} onChange={handleChange} placeholder="Image URL" className="border p-2 md:col-span-2" />
        <div className="md:col-span-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create Product</button>
        </div>
      </form>
    </div>
  );
}
