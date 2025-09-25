/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { brand: { blue: "#0B5BD3", green: "#00A36C" } },
    },
  },
  plugins: [],
};
