import { Link } from "react-router-dom";

interface NavLinkItem {
    label: string;
    href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "#about" },
  { label: "How it Works", href: "#how-it-works" },
];


const Navbar = ()=> {
    return (
        <nav className="fixed top-10 left-20 right-20 z-50 bg-white/90 backdrop-blur-md border border-blue-100 rounded-4xl h-16 flex items-center justify-between px-8">            <Link to="/" className="text-2xl font-bold text-blue-900 no-underline">
            Rapid Fix
            </Link>

            {/* NAV-BARS */}
            <ul className="flex gap-20 list-none m-0 p-0">
                {NAV_LINKS.map((link: NavLinkItem) => (
                <li key={link.label}>
                    <a
                    href={link.href}
                    className="text-gray-700 hover:text-blue-900/ font-medium text-m no-underline transition-colors duration-200"
                    >
                    {link.label}
                    </a>
                </li>
                ))}
            </ul>

            {/* Auth Buttons */}
            <div className="flex gap-3">
                <Link to="/login" className="px-4 py-2 rounded-4xl border-1 border-blue-900 text-orange hover: bg-blue-90 font-semibold text-sm no-underline transition-all duration-200">
                    Sign In
                </Link>

                <Link to="/signup" className="px-4 py-2 rounded-4xl border-blue-900 text-white hover: bg-blue-900 font-semibold text-sm no-underline transition-all duration-200">
                    Sign Up
                </Link>
            </div>
        </nav>
    );
}

export default Navbar;