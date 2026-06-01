import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, LayoutDashboard, LogOut } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import RapidFix from '../assets/RapidFix.png';

interface NavLinkItem {
    label: string;
    href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "#about" },
  { label: "How it Works", href: "#how-it-works" },
];

export default function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, appUser, signOut } = useAuth();
    const location = useLocation();

    const isLanding = location.pathname === "/";

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    return (
        <nav className="fixed top-5 left-6 right-6 md:left-20 md:right-20 z-50 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md border border-white/40 dark:border-slate-800/40 rounded-4xl h-16 flex items-center justify-between px-6 md:px-8 transition-all duration-300 shadow-[0_8px_32px_0_rgba(15,23,42,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.35)]">            
            <Link to="/" className="text-2xl font-bold text-blue-900 dark:text-white no-underline flex items-center">
                <img src={RapidFix} alt="RapidFix" className="h-14 md:h-16 dark:brightness-110" />     
            </Link>

            {/* NAV-BARS */}
            <ul className="hidden md:flex gap-4 lg:gap-6 list-none m-0 p-0 items-center">
                {NAV_LINKS.map((link: NavLinkItem) => {
                    const isActive = link.href === "/"
                        ? location.pathname === "/" && !location.hash
                        : location.pathname === link.href || (location.pathname === "/" && location.hash === link.href);

                    return (
                        <li key={link.label}>
                            {link.href.startsWith("#") ? (
                                isLanding ? (
                                    <a
                                        href={link.href}
                                        className={`px-4 py-2 rounded-full font-semibold text-sm no-underline transition-all duration-300 ${
                                            isActive
                                                ? "text-blue-900 dark:text-orange-500 bg-white/45 dark:bg-slate-900/45 backdrop-blur-[6px] border border-white/55 dark:border-slate-800/55 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(59,130,246,0.18)] dark:shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(249,115,22,0.18)]"
                                                : "text-slate-700 dark:text-slate-350 hover:text-blue-900 dark:hover:text-orange-500 border border-transparent"
                                        }`}
                                    >
                                        {link.label}
                                    </a>
                                ) : (
                                    <Link
                                        to={`/${link.href}`}
                                        className={`px-4 py-2 rounded-full font-semibold text-sm no-underline transition-all duration-300 ${
                                            isActive
                                                ? "text-blue-900 dark:text-orange-500 bg-white/45 dark:bg-slate-900/45 backdrop-blur-[6px] border border-white/55 dark:border-slate-800/55 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(59,130,246,0.18)] dark:shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(249,115,22,0.18)]"
                                                : "text-slate-700 dark:text-slate-350 hover:text-blue-900 dark:hover:text-orange-500 border border-transparent"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                )
                            ) : (
                                <Link
                                    to={link.href}
                                    className={`px-4 py-2 rounded-full font-semibold text-sm no-underline transition-all duration-300 ${
                                        isActive
                                            ? "text-blue-900 dark:text-orange-500 bg-white/45 dark:bg-slate-900/45 backdrop-blur-[6px] border border-white/55 dark:border-slate-800/55 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(59,130,246,0.18)] dark:shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(249,115,22,0.18)]"
                                            : "text-slate-700 dark:text-slate-350 hover:text-blue-900 dark:hover:text-orange-500 border border-transparent"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
                
                {isAuthenticated && (
                    <li>
                        <Link
                            to="/dashboard"
                            className={`px-4 py-2 rounded-full font-semibold text-sm no-underline transition-all duration-300 flex items-center gap-1.5 ${
                                location.pathname === "/dashboard"
                                    ? "text-blue-900 dark:text-orange-500 bg-white/45 dark:bg-slate-900/45 backdrop-blur-[6px] border border-white/55 dark:border-slate-800/55 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(59,130,246,0.18)] dark:shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(249,115,22,0.18)]"
                                    : "text-slate-700 dark:text-slate-350 hover:text-blue-900 dark:hover:text-orange-500 border border-transparent"
                            }`}
                        >
                            <LayoutDashboard size={15} />
                            Dashboard
                        </Link>
                    </li>
                )}
            </ul>

            {/* Auth Buttons & Theme Toggler */}
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full border border-blue-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm relative overflow-hidden group w-10 h-10"
                    aria-label="Toggle Theme"
                >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                        {theme === "light" ? (
                            <Moon className="w-5 h-5 text-blue-900 transition-all duration-300 transform rotate-0 scale-100 group-hover:rotate-12" />
                        ) : (
                            <Sun className="w-5 h-5 text-orange-400 transition-all duration-300 transform rotate-0 scale-100 group-hover:scale-110 group-hover:rotate-45" />
                        )}
                    </div>
                </button>

                {isAuthenticated ? (
                    <div className="flex items-center gap-2">
                        <Link 
                            to="/profile" 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all text-slate-800 dark:text-slate-200 no-underline shadow-sm animate-fade-in"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20 overflow-hidden shrink-0">
                                {appUser?.photo ? (
                                    <img src={appUser.photo} alt={appUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(appUser?.name || "")
                                )}
                            </div>
                            <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">{appUser?.name}</span>
                        </Link>
                        
                        <button
                            onClick={signOut}
                            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-all duration-200 flex items-center justify-center cursor-pointer"
                            title="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Link 
                            to="/login" 
                            className="px-4 py-2 rounded-4xl border border-blue-900 dark:border-orange-500 text-blue-900 dark:text-orange-500 hover:bg-blue-50 dark:hover:bg-orange-950/20 font-semibold text-sm no-underline transition-all duration-200"
                        >
                            Sign In
                        </Link>

                        <Link 
                            to="/signup" 
                            className="px-4 py-2 rounded-4xl bg-blue-900 dark:bg-orange-600 border border-blue-900 dark:border-orange-600 text-white hover:bg-blue-800 dark:hover:bg-orange-550 font-semibold text-sm no-underline transition-all duration-200"
                        >
                            Sign Up
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}