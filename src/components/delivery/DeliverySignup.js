'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/userLogin.css'; // For animation

export default function DeliverySignup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    const deliveryPersonData = {
      firstName,
      lastName,
      universityId,
      phone,
      email,
      password,
      confirmPassword,
      deliveryArea,
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/delivery-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryPersonData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful! You can now sign in.');
        setFirstName('');
        setLastName('');
        setUniversityId('');
        setPhone('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDeliveryArea('');
        setTimeout(() => router.push('/delivery/delivery-signin'), 1500);
      } else {
        alert(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="py-6 px-4">
        <div className="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          {/* Form */}
          <div className="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-[#6F4E37]">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="mb-12">
                <h1 className="text-white text-3xl font-semibold">Delivery Sign Up</h1>
                <p className="text-gray-200 text-[15px] mt-6 leading-relaxed">
                  Create a delivery account to start delivering orders.
                </p>
              </div>

              {/* Input Fields */}
              {[
                { label: 'First Name', value: firstName, setValue: setFirstName, placeholder: 'Enter first name' },
                { label: 'Last Name', value: lastName, setValue: setLastName, placeholder: 'Enter last name' },
                { label: 'University ID', value: universityId, setValue: setUniversityId, placeholder: 'Enter university ID' },
                { label: 'Phone Number', value: phone, setValue: setPhone, placeholder: 'Enter phone number', type: 'tel' },
                { label: 'Email', value: email, setValue: setEmail, placeholder: 'Enter your email', type: 'email' },
              ].map(({ label, value, setValue, placeholder, type = 'text' }) => (
                <div key={label}>
                  <label className="text-white text-sm font-medium mb-2 block">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    className="w-full text-sm text-black placeholder-gray-500 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600 focus:ring-2 focus:ring-blue-400"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              {/* Password */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-sm text-black placeholder-gray-500 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600 focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter password"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full text-sm text-black placeholder-gray-500 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600 focus:ring-2 focus:ring-blue-400"
                  placeholder="Confirm password"
                />
              </div>

              {/* Submit */}
              <div className="!mt-12">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full shadow-xl py-2.5 px-4 text-[15px] font-medium tracking-wide rounded-lg text-white focus:outline-none ${
                    isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#FF4081] hover:bg-pink-500'
                  }`}
                >
                  {isLoading ? 'Registering...' : 'Sign up'}
                </button>
                <p className="text-sm mt-6 text-center text-gray-200">
                  Already have an account?{' '}
                  <a href="/delivery/delivery-signin" className="text-white font-medium hover:underline ml-1 whitespace-nowrap">
                    Login here
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Image */}
          <div className="max-lg:mt-8 h-[calc(100%-75px)]">
            <img
              src="/signup.jpg"
              className="w-full h-full object-cover rounded-lg image-animation"
              alt="Delivery Signup Illustration"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
