import RapidFix from '../assets/RapidFix.png';

export default function Footer(){
    return(
        <footer className="bg-gradient-to-r from-slate-900 to-gray-900 text-white mt-12">

    <div className="flex flex-col md:flex-row justify-between items-start gap-10 px-10 py-5">

     
        <div>
            <img src={RapidFix} alt="RapudFix"  className="h-50"/>     
            {/* <h2 className="text-5xl font-bold mb-4">
                RapidFix
            </h2> */}

            <p className="text-gray-300 text-lg">
                Your trusted platform for home service solutions.
            </p>
        </div>


        <div>
            <h3 className="text-3xl font-semibold mb-4">
                Contact
            </h3>

            <p className="text-gray-300 mb-2">
                Email: support@rapidfix.com
            </p>

            <p className="text-gray-300 mb-2">
                Phone: +91 12345 67890
            </p>

            <p className="text-gray-300">
                Chennai, India
            </p>
        </div>

    </div>

    <div className="border-t border-gray-700 text-center py-5">
        <p className="text-gray-300 text-base">
            © 2026 RapidFix. All rights reserved.
        </p>
    </div>

</footer>
    )
}