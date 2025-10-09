🎨 Color Signs NY Website

A modern Next.js 14 website built for Color Signs NY — featuring Firebase authentication, a dynamic Hero Carousel, and a clean Tailwind CSS design.

🚀 Getting Started
1. Install dependencies

Run the following commands in your project folder:

npm install
npm install firebase lucide-react


If Tailwind CSS wasn’t included when you created the project, also install and configure it:

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


Then update your tailwind.config.ts (or .js) with:

content: [
  "./app/**/*.{js,ts,jsx,tsx}",
  "./components/**/*.{js,ts,jsx,tsx}"
],
theme: {
  extend: {},
},
plugins: [],

2. Run the development server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev


Visit http://localhost:3000
 in your browser to view the site.

🔥 Firebase Setup

The app uses Firebase Authentication and Firestore for user data.

Go to Firebase Console
 and create a new project.

In your project settings, add a Web App and copy the Firebase configuration.

Create a .env.local file at the root of your project with your Firebase keys:

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id


The configuration is loaded inside lib/firebase.ts (automatically imported by your app).

🧩 Project Structure
app/
 ├── layout.tsx          # Global layout and header
 ├── page.tsx            # Main homepage (with HeroCarousel)
 ├── login/              # User login page
 ├── signup/             # User signup page
 ├── profile/            # User profile page
 ├── services/           # Service listings
 ├── contact/            # Contact form page

components/
 ├── Header.tsx          # Navigation bar and user auth menu
 ├── HeroCarousel.tsx    # Auto-rotating image carousel

lib/
 ├── firebase.ts         # Firebase configuration

public/
 ├── logo.png
 ├── shop_0.jpeg
 ├── shop_1.jpeg
 ├── shop_2.jpeg
 ├── shop_3.jpeg
 └── shop_4.jpeg

🖼️ Hero Carousel

Your homepage uses a Hero Carousel (components/HeroCarousel.tsx) that automatically cycles through images from the public folder.

Features include:

Auto-rotation every 4 seconds (customizable)

Left/right arrow controls using lucide-react

Keyboard navigation (arrow keys)

Pause on hover

Dots for manual slide selection

To change the images, simply replace /public/shop_0.jpeg → /shop_4.jpeg with your own.

🎨 Styling

The project uses Tailwind CSS for all layout and design.

Background and text colors can be customized in /app/globals.css or inside component-level classNames.

The header and carousel support responsive design out-of-the-box.

🧠 Technologies Used

Next.js 14 (App Router)

Firebase Authentication + Firestore

Tailwind CSS

Lucide React (icon library)

TypeScript

⚙️ Scripts
Command	Description
npm run dev	Start local dev server
npm run build	Build production bundle
npm run start	Run production server
npm run lint	Lint all files
☁️ Deployment

The easiest way to deploy your site is through Vercel:

Push your project to GitHub.

Go to vercel.com/new
.

Import your repository.

Add your .env variables under Project Settings → Environment Variables.

Deploy!

📖 Learn More
Next.js Documentation
Tailwind CSS Docs
Firebase Docs
Lucide React Docs