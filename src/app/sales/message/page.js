"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeftIcon,
  UsersIcon,
  SendIcon,
  ImageIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function SendMessage() {
  const router = useRouter();
  const [messageType, setMessageType] = useState("email"); // 'email' | 'sms' | 'push'
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleTime, setScheduleTime] = useState("now"); // 'now' | 'optimal' | 'custom'
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const [reach, setReach] = useState(null);
  const [loadingReach, setLoadingReach] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch real audience size
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingReach(true);
        const res = await fetch(
          `${API_BASE}/api/messaging/audience-size?audience=${audience}`,
          { credentials: "include", headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(await res.text());
        const { count } = await res.json();
        if (alive) setReach(typeof count === "number" ? count : 0);
      } catch (e) {
        if (alive) setReach(null);
        console.error("reach fetch failed:", e);
      } finally {
        if (alive) setLoadingReach(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [audience]);

  const tooLongSms = messageType === "sms" && message.length > 160;
  const tooLongPush = messageType === "push" && message.length > 100;

  async function handleSubmit(e) {
    e.preventDefault();

    if (messageType === "email" && !subject.trim()) {
      alert("Subject is required for email");
      return;
    }
    if (tooLongPush) {
      alert("Push message exceeds 100 chars");
      return;
    }

    const payload = {
      messageType,
      audience,
      subject: messageType === "email" ? subject.trim() : undefined,
      message: message.trim(),
      schedule: { mode: scheduleTime }, // 'now' | 'optimal' | 'custom'
    };
    if (scheduleTime === "custom") {
      const atISO = new Date(`${customDate}T${customTime}:00`).toISOString();
      payload.schedule.at = atISO;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/messaging/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json && json.message ? json.message : "Send failed");

      if (json.sent) {
        alert(`Sent successfully to ${json.sent} recipients`);
      } else if (json.scheduled) {
        alert(
          `Scheduled ${json.scheduled} messages ${
            json.when ? `(${json.when})` : ""
          }`
        );
      } else {
        alert("Request accepted.");
      }
      router.push("/customers");
    } catch (e) {
      console.error("send failed:", e);
      alert(e.message || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 mr-2 rounded-full hover:bg-gray-100"
          type="button"
        >
          <ArrowLeftIcon size={20} className="text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          Send Customer Message
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Message type */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {[
                { key: "email", label: "Email Campaign" },
                { key: "sms", label: "SMS Message" },
                { key: "push", label: "Push Notification" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMessageType(t.key)}
                  className={`py-2 px-4 text-sm rounded-md flex items-center justify-center ${
                    messageType === t.key
                      ? "bg-green-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UsersIcon size={16} className="text-gray-400" />
              </div>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Customers</option>
                <option value="active">Active Customers (last 30 days)</option>
                <option value="loyalty">Loyalty Program Members</option>
                <option value="new">New Customers (last 7 days)</option>
                <option value="dormant">
                  Dormant Customers (inactive 60+ days)
                </option>
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Estimated reach:&nbsp;
              {loadingReach ? "…" : reach == null ? "—" : reach} customers
            </p>
          </div>

          {/* Subject (email only) */}
          {messageType === "email" && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Line*
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter email subject"
                required={messageType === "email"}
              />
            </div>
          )}

          {/* Message */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Content*
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={messageType === "email" ? 8 : 4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={`Type your ${
                messageType === "email"
                  ? "email"
                  : messageType === "sms"
                  ? "SMS"
                  : "push notification"
              } message here...`}
              required
            />
            {messageType === "sms" && (
              <p className="mt-1 text-sm text-gray-500">
                {message.length}/160 characters
                {tooLongSms && (
                  <span className="ml-2 text-orange-500 inline-flex items-center">
                    <AlertCircleIcon size={14} className="mr-1" />
                    Will be sent as multiple messages (if provider supports)
                  </span>
                )}
              </p>
            )}
            {messageType === "push" && (
              <p className="mt-1 text-sm text-gray-500">
                {message.length}/100 characters
                {tooLongPush && (
                  <span className="ml-2 text-orange-500 inline-flex items-center">
                    <AlertCircleIcon size={14} className="mr-1" />
                    Message too long for push notification
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Email images UI (placeholder) */}
          {messageType === "email" && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add Images
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <ImageIcon size={36} className="mx-auto text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                    >
                      <span>Upload images</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send Time
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {[
                { key: "now", label: "Send Immediately" },
                { key: "optimal", label: "Optimal Time" },
                { key: "custom", label: "Schedule for Later" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScheduleTime(s.key)}
                  className={`py-2 px-4 text-sm rounded-md ${
                    scheduleTime === s.key
                      ? "bg-orange-500 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {scheduleTime === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            </>
          )}

          {scheduleTime === "optimal" && (
            <div className="col-span-2">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-700">
                  Messages will be delivered at each customer’s predicted best
                  time in the next 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-60"
          >
            <SendIcon size={18} className="mr-1" />
            {submitting
              ? "Working…"
              : scheduleTime === "now"
              ? "Send Message"
              : scheduleTime === "optimal"
              ? "Schedule Optimal"
              : "Schedule Message"}
          </button>
        </div>
      </form>
    </div>
  );
}
