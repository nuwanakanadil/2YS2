'use client'
import { useEffect, useState } from 'react'
import Table from './Table'

const columns = [
  { header: 'Manager', accessor: 'manager' },
  { header: 'Email', accessor: 'email' },
  { header: 'Canteen', accessor: 'canteen' },
  { header: 'Created', accessor: 'created' },
]

export default function ManagersTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const API = process.env.NEXT_PUBLIC_API_BASE

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/managers`, { credentials: 'include' })
      const d = await r.json()
      setRows(d.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const renderRow = (m) => (
    <tr key={m._id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-orange-50">
      <td className="p-3 font-semibold">{m.firstName} {m.lastName}</td>
      <td className="p-3 text-xs text-gray-700">{m.email}</td>
      <td className="p-3">
        <div className="font-semibold">{m.canteen?.name || '-'}</div>
      </td>
      <td className="p-3">{new Date(m.createdAt).toLocaleDateString()}</td>
    </tr>
  )

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Existing Managers</h2>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>
      <Table columns={columns} data={rows} renderRow={renderRow} />
    </div>
  )
}
