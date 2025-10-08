// in components/Header.tsx
import Link from 'next/link';

export default function Header() {
    return (
        <header className="bg-[#b68460] shadow-md">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link href="/" className="text-2xl font-bold text-white-800">
                    {/* You can put your new logo here later */}
                    Color Signs
                </Link>
                <div className="space-x-4">
                    <Link href="/" className="text-white-600 hover:text-blue-500">Home</Link>
                    <Link href="/services" className="text-white-600 hover:text-blue-500">Services</Link>
                    <Link href="/about" className="text-white-600 hover:text-blue-500">About Us</Link>
                    <Link href="/contact" className="text-white-600 hover:text-blue-500">Contact Us</Link>
                    <Link href="/signup" className="text-white-600 hover:text-blue-500">Sign Up</Link>
                    {/* Add links to About and Contact pages later */}
                </div>
            </nav>
        </header>
    );
}