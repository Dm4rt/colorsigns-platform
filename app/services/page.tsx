// in app/services/page.tsx
export default function ServicesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold">Our Services</h1>
      <ul className="mt-8 list-disc space-y-2">
        <li>Custom Signs</li>
        <li>Banners</li>
        <li>T-Shirts & Apparel</li>
        <li>Truck Lettering & Decals</li>
      </ul>
    </main>
  );
}