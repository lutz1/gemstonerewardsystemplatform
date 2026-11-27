import { useEffect, useState } from "react";
import mainBannerOne from "../../../assets/mainbanner1.png";
import mainBannerTwo from "../../../assets/mainbanner2.png";
import mainBannerThree from "../../../assets/mainbanner3.png";
import "./DashboardBannerCarousel.css";

const SLIDE_DURATION = 8000;
const banners = [
  {
    image: mainBannerOne,
    alt: "Gemstone Advertisement Marketing: shop, sell, earn, and grow together.",
  },
  {
    image: mainBannerTwo,
    alt: "Queen of K premium personal care and wellness products, from Gemstone Advertisement Marketing.",
  },
  {
    image: mainBannerThree,
    alt: "Zaimons Outdoor sandals, designed for lightweight comfort, grip, and durability.",
  },
];

export default function DashboardBannerCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (
      isPaused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlide((slide) => (slide + 1) % banners.length);
    }, SLIDE_DURATION);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  return (
    <section
      className="dash-banner-carousel"
      role="region"
      aria-label="Featured member banners, automatically rotating"
      aria-roledescription="carousel"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="dash-banner-frame">
        <div
          className="dash-banner-track"
          style={{
            transform: `translateX(-${activeSlide * (100 / banners.length)}%)`,
          }}
        >
          {banners.map((banner, index) => (
            <div
              className="dash-banner-slide"
              key={banner.image}
              role="group"
              aria-label={`Slide ${index + 1} of ${banners.length}`}
              aria-roledescription="slide"
              aria-hidden={index !== activeSlide}
            >
              <img
                className="dash-banner-image"
                src={banner.image}
                alt={banner.alt}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
