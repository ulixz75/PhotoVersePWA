/** @type {import('tailwindcss').Config} */
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
       "./*.{js,ts,jsx,tsx}",
       "./components/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {
         fontFamily: {
           sans: ['Nunito', 'sans-serif'],
         },
         colors: {
           'main-teal': '#14B8A6',
           'surface': '#F0FDFA',
           'primary': '#F472B6',
           'primary-dark': '#EC4899',
           'secondary': '#34D399',
           'secondary-dark': '#10B981',
           'accent': '#FBBF24',
           'accent-dark': '#F59E0B',
           'text-dark': '#1F2937',
           'text-light': '#4B5563',
           'shadow-dark': '#0F766E',
           'shadow-light': '#5EEAD4',
           'card-blue': '#93C5FD',
           'card-green': '#A7F3D0',
           'card-yellow': '#FDE047',
           'card-pink': '#F9A8D4',
           'card-purple': '#D8B4FE',
           'card-orange': '#FDBA74',
         },
         boxShadow: {
           'clay': '7px 7px 15px #0F766E, -7px -7px 15px #5EEAD4',
           'clay-inset': 'inset 7px 7px 15px #0F766E, inset -7px -7px 15px #5EEAD4',
           'clay-sm': '4px 4px 8px #0F766E, -4px -4px 8px #5EEAD4',
           'clay-sm-inset': 'inset 4px 4px 8px #0F766E, inset -4px -4px 8px #5EEAD4',
         },
         borderRadius: {
           '4xl': '2rem',
           '5xl': '3rem',
         }
       }
     },
     plugins: [],
   }
