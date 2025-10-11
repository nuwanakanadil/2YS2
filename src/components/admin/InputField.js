import PropTypes from "prop-types";

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  inputProps,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full md:w-1/4">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        {...register(name)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p className="text-xs text-red-400">{error.message.toString()}</p>
      )}
    </div>
  );
};

InputField.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  register: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  error: PropTypes.object,
  inputProps: PropTypes.object,
};

export default InputField;
