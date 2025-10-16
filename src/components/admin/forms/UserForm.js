"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import InputField from "../InputField";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";

// ---------------- ZOD SCHEMA ----------------
const baseSchema = z.object({
  email: z.string().email({ message: "Invalid email address!" }),
  firstName: z.string().min(1, { message: "First name is required!" }),
  lastName: z.string().min(1, { message: "Last name is required!" }),
  phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
  universityId: z.string().min(1, "University ID is required"),
  img: z.any().optional(), // This is now optional in both create and update
});

// For "create": image is optional (no more required)
function makeSchema(type) {
  return baseSchema;
}

export default function UserForm({ type, data, id, onDone }) {
  const schema = makeSchema(type);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: data?.email || "",
      firstName: data?.firstName || "",
      lastName: data?.lastName || "",
      phone: data?.phone || "",
      universityId: data?.universityId || "",
      img: undefined,
    },
  });

  // Prefill when data changes (safety if modal re-opens with new row)
  useEffect(() => {
    if (!data) return;
    setValue("email", data.email || "");
    setValue("firstName", data.firstName || "");
    setValue("lastName", data.lastName || "");
    setValue("phone", data.phone || "");
    setValue("universityId", data.universityId || "");
  }, [data, setValue]);

  const [serverError, setServerError] = useState("");
  const isView = type === "view";

  const onSubmit = handleSubmit(async (formData) => {
    try {
      setServerError("");

      // Debug log to inspect what data is being passed
      console.log("Form data before submit:", formData);

      // 1) If image was chosen, upload it first
      let uploadedPath;
      const chosen = formData.img?.[0] ?? (formData.img instanceof File ? formData.img : null);
      if (chosen) {
        const fd = new FormData();
        fd.append("profilePic", chosen);
        // if your upload endpoint needs userId (you used it in other code), add it:
        if (id) fd.append("userId", id);

        const up = await fetch(`${API_ORIGIN}/api/user/upload-profile-pic`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const upJson = await up.json();
        if (!up.ok) {
          throw new Error(upJson.message || "Image upload failed");
        }
        uploadedPath = upJson.profilePic; // e.g. "profile-images/abc.png"
      }

      // 2) Create or Update
      if (type === "create") {
        // Admin creates a CUSTOMER; backend auto-generates password + emails it
        const res = await fetch(`${API_ORIGIN}/api/auth/admin/create-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            universityId: formData.universityId,
            role: "CUSTOMER",
            // no password here — backend generates & emails it
            ...(uploadedPath ? { profilePic: uploadedPath } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Create failed");
        alert(json.emailSent ? "User created and email sent" : "User created (email failed to send)");
        onDone?.(); // parent can refresh list & close modal
        return;
      }

      if (type === "update") {
        if (!id) throw new Error("Missing user id for update");
        const res = await fetch(`${API_ORIGIN}/api/auth/admin/customers/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            universityId: formData.universityId,
            ...(uploadedPath ? { profilePic: uploadedPath } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Update failed");
        alert("User updated");
        onDone?.();
        return;
      }
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Something went wrong");
    }
  });

  const bgColor =
    type === "create" ? "bg-green-500" : type === "update" ? "bg-orange-500" : "bg-lamaSky";

  // Make fields read-only in view mode
  const readOnlyProps = isView
    ? { readOnly: true, disabled: true, className: "opacity-70 cursor-not-allowed" }
    : {};

  const previewSrc = useMemo(() => {
    const src = data?.profilePic;
    if (!src) return "/profile2.png";
    const clean = String(src).replace(/\\/g, "/");
    if (/^https?:\/\//i.test(clean) || clean.startsWith("/")) return clean;
    return `${API_ORIGIN.replace(/\/+$/, "")}/${clean.replace(/^\/+/, "")}`;
  }, [data]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Add a new customer"
         : type === "update" ? "Update customer"
         : "Customer details"}
      </h1>

      {!!serverError && (
        <div className="text-red-600 text-sm -mt-2">{serverError}</div>
      )}

      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors.email}
          {...readOnlyProps}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="First Name"
          name="firstName"
          defaultValue={data?.firstName}
          register={register}
          error={errors.firstName}
          {...readOnlyProps}
        />
        <InputField
          label="Last Name"
          name="lastName"
          defaultValue={data?.lastName}
          register={register}
          error={errors.lastName}
          {...readOnlyProps}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
          {...readOnlyProps}
        />
        <InputField
          label="University ID"
          name="universityId"
          defaultValue={data?.universityId}
          register={register}
          error={errors.universityId}
          {...readOnlyProps}
        />
      </div>

      {!isView && (
        <button
          disabled={isSubmitting}
          className={`${bgColor} text-white p-2 rounded-md disabled:opacity-50`}
        >
          {isSubmitting
            ? (type === "create" ? "Creating..." : "Updating...")
            : (type === "create" ? "Create" : "Update")}
        </button>
      )}
    </form>
  );
};

