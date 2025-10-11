'use client'
import { useEffect, useState } from 'react'
import Table from './Table'

const columns = [
  { header: 'Manager', accessor: 'manager' },
  { header: 'Canteen', accessor: 'canteen' },
  { header: 'Submitted', accessor: 'submitted' },
  { header: 'Actions', accessor: 'actions' },
]

export default function ManagerApprovalsTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const API = process.env.NEXT_PUBLIC_API_BASE

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/manager-registrations?status=PENDING`, { credentials: 'include' })
      const d = await r.json()
      setRows(d.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function approve(id) {
    await fetch(`${API}/api/admin/manager-registrations/${id}/approve`, { method: 'POST', credentials: 'include' })
    await load()
  }

  async function reject(id) {
    const reason = window.prompt('Reason (optional):') || ''
    await fetch(`${API}/api/admin/manager-registrations/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    })
    await load()
  }

  const renderRow = (item) => (
    <tr key={item._id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-orange-50">
      <td className="p-3">
        <div className="font-semibold">{item.firstName} {item.lastName}</div>
        <div className="text-xs text-gray-500">{item.email}</div>
      </td>
      <td className="p-3">
        <div className="font-semibold">{item?.canteen?.name}</div>
        <div className="text-xs text-gray-500">
          {item?.canteen?.address?.city}{item?.canteen?.address?.city ? ', ' : ''}{item?.canteen?.address?.country}
        </div>
      </td>
      <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
      <td className="p-3">
        <div className="flex gap-2">
          <button onClick={() => approve(item._id)} className="px-3 py-1 rounded bg-green-600 text-white">Approve</button>
          <button onClick={() => reject(item._id)} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Pending Managers</h2>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>
      <Table columns={columns} data={rows} renderRow={renderRow} />
    </div>
  )
}
