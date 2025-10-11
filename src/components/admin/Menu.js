import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

const currentRole = String(role || "").toLowerCase();

const menuItems = [
  {
    title: "MENU",
    items: [
      // --- Admin-only items ---
      {
        icon: "/home.png",
        label: "Home",
        href: "/admin",
        visible: ["admin"],
      },
      {
        icon: "/shop.png",
        label: "Canteens",
        href: "/list/canteens",
        visible: ["admin"],
      },
      {
        icon: "/customer.png",
        label: "Customers",
        href: "/list/customers",
        visible: ["admin"],
      },
      {
        icon: "/manager.png",
        label: "Managers",
        href: "/list/managers",
        visible: ["admin"],
      },
      {
        icon: "/delivery.png",
        label: "Delivery Service",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/inventory_clerk.png",
        label: "Inventory Clerk",
        href: "/list/inventory_clerk",
        visible: ["admin"],
      },
      {
        icon: "/payment.png",
        label: "Payments",
        href: "/list/lessons",
        visible: ["admin"],
      },
      {
        icon: "/reviews.png",
        label: "Reviews",
        href: "/list/messages",
        visible: ["admin"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin"],
      },

      // --- Inventory-only items (hidden from admin) ---
      {
        icon: "/menu.png",
        label: "Inventory",
        href: "/list/inventory",
        visible: ["admin", "inventory"],
      },
      {
        icon: "/capacity.png",
        label: "Stock Monitoring",
        href: "/list/inventory-monitoring",
        visible: ["admin", "inventory"],
      },
      {
        icon: "/finance.png",
        label: "Analytics",
        href: "/list/analytics",
        visible: ["admin", "inventory"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      // Profile visible to both (you asked inventory to see it; leaving for admin too is usually fine)
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin", "inventory"],
      },
      // Settings: only inventory (per your requirement “inventory can see profile, settings and inventory parts”)
      {
        icon: "/logout.png",
        label: "Logout",
        href: "/logout",
        visible: ["admin", "inventory"],
      },
    ],
  },
];

const Menu = () => {
  return (
    <div className="mt-4 text-sm">
      {menuItems.map((section) => {
        const visibleItems = section.items.filter((item) =>
          (item.visible || []).includes(currentRole)
        );

        // If a whole section ends up empty for a role, skip rendering it.
        if (visibleItems.length === 0) return null;

        return (
          <div className="flex flex-col gap-2" key={section.title}>
            <span className="hidden lg:block text-gray-400 font-light my-4">
              {section.title}
            </span>
            {visibleItems.map((item) => (
              <Link
                href={item.href}
                key={item.label}
                className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-green-50"
              >
                <Image src={item.icon} alt="" width={20} height={20} />
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default Menu;
