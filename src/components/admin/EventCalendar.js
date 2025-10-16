"use client";

import Image from "next/image";
import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const events = [
  {
    id: 1,
    title: "Main Canteen Maintenance",
    time: "8:00 AM - 10:00 AM",
    description: "Scheduled cleaning and electrical checks.",
  },
  {
    id: 2,
    title: "Science Block Menu Update",
    time: "10:30 AM - 11:00 AM",
    description: "New vegan options added to the menu.",
  },
  {
    id: 3,
    title: "Tech Café Coffee Machine Upgrade",
    time: "1:00 PM - 2:00 PM",
    description: "Replacing older machine with smart coffee station.",
  },
  {
    id: 4,
    title: "Business Hub Staff Meeting",
    time: "3:00 PM - 4:00 PM",
    description: "Discussing monthly revenue and hygiene protocols.",
  },
  {
    id: 5,
    title: "Food Truck Arrival",
    time: "5:00 PM - 7:00 PM",
    description: "Evening snacks and smoothies by parking area.",
  },
  {
    id: 6,
    title: "Surprise Free Ice Cream Day!",
    time: "2:00 PM - 4:00 PM",
    description: "First 200 students get free ice cream at Main Canteen.",
  },
];

const EventCalendar = () => {
  const [value, onChange] = useState(new Date());

  return (
    <div className="bg-white p-4 rounded-md h-full flex flex-col">
      {/* Calendar */}
      <Calendar onChange={onChange} value={value} />

      {/* Header */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <h1 className="text-xl font-semibold">Events</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      {/* Scrollable Event List */}
      <div
        className="flex flex-col gap-4 overflow-y-auto pr-2"
        style={{ maxHeight: "325px", paddingBottom: "24px" }}
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-orange-200 even:border-t-green-200"
            style={{ marginBottom: index === events.length - 1 ? "24px" : 0 }}
          >
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-600">{event.title}</h1>
              <span className="text-gray-300 text-xs">{event.time}</span>
            </div>
            <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendar;
