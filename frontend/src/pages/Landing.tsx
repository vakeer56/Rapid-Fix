import Navbar from "../components/Navbar"
import Hero from "../pages/Hero"
import HowItWorks from "../components/HowItWorks"
import CommonIssuesGrid from "../components/CommonIssues"

const LandingPage = () => {
    return (
        <div>
            <Navbar/>
            <Hero/>
            <HowItWorks/>
            <CommonIssuesGrid/>
        </div>
    )
}

export default LandingPage;