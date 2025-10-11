const announcements = [
  {
    id: 1,
    title: "Power Outage in Main Canteen",
    date: "2025-07-28",
    content:
      "Scheduled power maintenance will take place from 10:00 AM to 12:00 PM. Please use other outlets during this time.",
    color: "bg-orange-100",
  },
  {
    id: 2,
    title: "New Digital Payment Option",
    date: "2025-07-27",
    content:
      "You can now pay using your university ID card or QR wallets at all canteen counters.",
    color: "bg-green-100",
  },
  {
    id: 3,
    title: "Price Revision Notice",
    date: "2025-07-26",
    content:
      "Due to increased supply costs, some item prices will be revised from August 1st.",
    color: "bg-orange-100",
  },
  {
    id: 4,
    title: "Menu Update in Tech Café",
    date: "2025-07-25",
    content:
      "Introducing high-protein wraps, new milkshake flavors, and allergy-safe meals starting this week.",
    color: "bg-green-100",
  },
  {
    id: 5,
    title: "Lost & Found Box Shifted",
    date: "2025-07-24",
    content:
      "Items found in canteen areas will now be stored in the admin office near Entrance B.",
    color: "bg-orange-100",
  },
];

const Announcements = () => {
  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400 cursor-pointer hover:underline">View All</span>
      </div>

      {/* Scrollable container without visible scrollbar */}
      <div className="flex flex-col gap-4 mt-4 max-h-[280px] overflow-y-auto scrollbar-hide pr-1">
        {announcements.map((item) => (
          <div key={item.id} className={`${item.color} rounded-md p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-700">{item.title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {item.date}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;
