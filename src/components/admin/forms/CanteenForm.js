"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputField from "../InputField";
import Image from "next/image";

const schema = z.object({
  name: z.string().min(1, { message: "Canteen name is required!" }),
  location: z.string().min(1, { message: "Location is required!" }),
  contact: z.string().min(1, { message: "Contact is required!" }),
  manager: z.string().min(1, { message: "Manager name is required!" }),
  capacity: z
    .number({ invalid_type_error: "Capacity must be a number" })
    .int()
    .min(1, { message: "Capacity must be at least 1" }),
  img: z.any().refine((file) => file instanceof FileList && file.length > 0, {
    message: "Image is required",
  }),
});

const CanteenForm = ({ type, data }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: data?.name || "",
      location: data?.location || "",
      contact: data?.contact || "",
      manager: data?.manager || "",
      capacity: data?.capacity || 0,
    },
  });

  // If you want to set the image file as default, you might need a separate handler
  // For now, img input will be empty on update since file inputs can't have default value

  const onSubmit = handleSubmit((formData) => {
    // Capacity comes as string from input, convert to number
    formData.capacity = Number(formData.capacity);
    console.log(formData);
  });

  const bgColor =
  type === "create"
    ? "bg-green-400"
    : type === "update"
    ? "bg-orange-400"
    : "bg-lamaPurple";

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new canteen" : "Update canteen"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Canteen Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Location"
          name="location"
          defaultValue={data?.location}
          register={register}
          error={errors?.location}
        />
        <InputField
          label="Contact"
          name="contact"
          defaultValue={data?.contact}
          register={register}
          error={errors?.contact}
        />
        <InputField
          label="Manager"
          name="manager"
          defaultValue={data?.manager}
          register={register}
          error={errors?.manager}
        />
        <InputField
          label="Capacity"
          name="capacity"
          type="number"
          defaultValue={data?.capacity}
          register={register}
          error={errors?.capacity}
        />
      </div>

      <div className="flex flex-col gap-2 w-full md:w-1/4 justify-center">
        <label
          className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
          htmlFor="img"
        >
          <Image src="/upload.png" alt="Upload" width={28} height={28} />
          <span>Upload a photo</span>
        </label>
        <input
          type="file"
          id="img"
          {...register("img")}
          className="hidden"
        />
        {errors?.img && (
          <p className="text-xs text-red-400">{errors.img.message}</p>
        )}
      </div>

      <button className={`${bgColor} text-white p-2 rounded-md`}>
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default CanteenForm;
