"use client";

import { useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { calendarEvents } from "@/lib/data"; // Make sure this exists and exports a JS array

const localizer = momentLocalizer(moment);

const BigCalendar = () => {
  const [view, setView] = useState("work_week");

  const handleOnChangeView = (selectedView) => {
    if (selectedView === "work_week" || selectedView === "day") {
      setView(selectedView);
    }
  };

  return (
    <div style={{ height: "100%", padding: "1rem" }}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        views={[Views.WORK_WEEK, Views.DAY]}
        view={view}
        onView={handleOnChangeView}
        style={{ height: "90vh" }}
        min={new Date(2025, 1, 1, 8, 0, 0)}  // 1 Feb 2025, 8:00 AM
        max={new Date(2025, 1, 1, 17, 0, 0)} // 1 Feb 2025, 5:00 PM
      />
    </div>
  );
};

export default BigCalendar;
