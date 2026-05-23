import Navbar from "../components/Navbar"
import Hero from "../pages/Hero"
import HowItWorks from "../components/HowItWorks"
import CommonIssuesGrid from "../components/CommonIssues"
import Footer from "../components/Footer"
const LandingPage = () => {
    return (
        <div>
            <Navbar/>
            <Hero/>
            <HowItWorks/>
            <CommonIssuesGrid/>
            <Footer></Footer>
        </div>
    )
}

export default LandingPage;