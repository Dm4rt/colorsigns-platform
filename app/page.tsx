import HeroCarousel from '@/components/HeroCarousel';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#57a797]">
      {/* Full-bleed hero right under the header */}
      <HeroCarousel
        fullBleed
        heightClass="h-[50vh] md:h-[60vh]"  // tweak the hero band height
        autoPlayMs={4000}
      />

      {/* Title/Info (make text white instead of beige) */}
      <section className="text-center mt-10 px-4 text-white">
        <h1 className="text-4xl font-bold">Color Signs NY</h1>
        <p className="mt-4 text-lg opacity-90">The new website is under construction!</p>
      </section>
    </main>
  );
}
