/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./assets/**/*.{js,ts,tsx}",
    "./index.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0040A1",
        primaryLight: "#0056D2",
        accent: "#FFC300",

        background: "#F7F9FC",
        surface: "#FFFFFF",
        surfaceLow: "#F2F4F7",

        textPrimary: "#191C1E",
        textSecondary: "#424654",
      }
    },
  },
  plugins: [],
}