import { MainHeader } from "@/components/main-header";
import HeroSection from "./components/hero-section";
import ExploreLandTypes from "@/components/explore-land-types";
import WhyParcel from "./components/why-parcel";
import { FeaturedListings } from "@/components/featured-list";
import { FindYourLandCta } from "./components/find-your-land";
import ExploreActivityTypes from "@/components/explore-activity-types";
import { LandingHome } from "./components/landing-home";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
    {/* TODO : Updated Home Page and remove the old components */}
      {/* <HeroSection />
      <ExploreLandTypes />
      <FeaturedListings />
      <WhyParcel />
      <ExploreActivityTypes />
      <FindYourLandCta /> */}
      <LandingHome />
    </>
  )
}
