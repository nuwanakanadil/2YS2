import FormModal from "@/components/admin/FormModal";
import Pagination from "@/components/admin/Pagination";
import Table from "@/components/admin/Table";
import TableSearch from "@/components/admin/TableSearch";
import Image from "next/image";
import { role } from "@/lib/data";
import { headers } from "next/headers";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000").replace(/\/+$/, "");

const columns = [
  { header: "Title", accessor: "title" },
  { header: "Canteen", accessor: "canteen" },
  { header: "Audience", accessor: "audience", className: "hidden md:table-cell" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  { header: "Actions", accessor: "action" },
];

async function getAnnouncements() {
  const h = headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`${API_BASE}/api/announcements`, {
    cache: "no-store",
    // Forward browser cookies to the API so authMiddleware sees req.cookies.token
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch announcements: ${res.status} ${text}`);
  }

  const list = await res.json();
  return list.map((a) => ({
    id: a._id,
    title: a.title,
    canteen: a?.canteen?.name || "N/A",
    audience: a?.targetAudience || "ALL",
    date: a?.date ? a.date.slice(0, 10) : "",
  }));
}

const AnnouncementListPage = async () => {
  const data = await getAnnouncements();

  const renderRow = (item) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.canteen}</td>
      <td className="hidden md:table-cell">{item.audience}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal table="announcement" type="update" data={item} />
              <FormModal table="announcement" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Canteen Announcements</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="announcement" type="create" />}
          </div>
        </div>
      </div>

      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination />
    </div>
  );
};

export default AnnouncementListPage;
