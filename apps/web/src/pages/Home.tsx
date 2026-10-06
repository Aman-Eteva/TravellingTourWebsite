import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  CalendarDays,
  Search,
  ShieldCheck,
  Users,
  Leaf,
  Star,
  Compass,
  Mountain,
  Palmtree,
  Flower2,
  Landmark,
} from "lucide-react";
import { get } from "../lib/api";
import type { Tour, Destination, Review } from "../types";
import { TourCard } from "../components/TourCard";
import { Loading, ErrorState } from "../components/ui";
export function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const tours = useQuery({
    queryKey: ["featured"],
    queryFn: () => get<{ items: Tour[] }>("/tours?featured=true&limit=3"),
  });
  const destinations = useQuery({
    queryKey: ["destinations"],
    queryFn: () => get<Destination[]>("/destinations"),
  });
  const reviews = useQuery({
    queryKey: ["public-reviews"],
    queryFn: () => get<Review[]>("/reviews"),
  });
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          fetchPriority="high"
          decoding="async"
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2400&q=90"
          alt="Alpine lake surrounded by green mountains and a peaceful lakeside village"
        />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="hero-label">
            <span /> LESS ORDINARY. MORE YOU.
          </div>
          <h1>
            Go somewhere
            <br />
            that <em>stays with you.</em>
          </h1>
          <p>
            Big little moments. Unfamiliar places. A world worth feeling.
            <br />
            Discover thoughtfully crafted journeys for your curious side.
          </p>
          <Link to="/tours" className="btn btn-light">
            Find your kind of adventure <ArrowUpRight size={18} />
          </Link>
          <div className="hero-proof">
            <div className="avatar-stack">
              <img src="https://i.pravatar.cc/80?img=47" alt="" />
              <img src="https://i.pravatar.cc/80?img=12" alt="" />
              <img src="https://i.pravatar.cc/80?img=44" alt="" />
            </div>
            <div>
              <div className="stars">★★★★★</div>
              <span>Little groups. Lasting connections.</span>
            </div>
          </div>
        </div>
        <div className="hero-caption">
          <MapPin size={15} /> Somewhere you’ll wish you stayed longer{" "}
          <span>TAKE THE SCENIC ROUTE</span>
        </div>
      </section>
      <div className="container search-wrap">
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (date) params.set("date", date);
            navigate(`/tours?${params}`);
          }}
        >
          <label>
            <MapPin />
            <span>
              <strong>Where’s calling?</strong>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a destination or experience"
              />
            </span>
          </label>
          <label>
            <CalendarDays />
            <span>
              <strong>When shall we go?</strong>
              <input
                aria-label="Departure date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </span>
          </label>
          <button className="btn">
            <Search size={19} /> Explore journeys
          </button>
        </form>
      </div>
      <div className="container trust-strip">
        <span>
          <ShieldCheck />
          Thoughtfully planned, every detail
        </span>
        <span>
          <Users />
          Small groups, real connections
        </span>
        <span>
          <Leaf />
          Local experiences, lasting impact
        </span>
      </div>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD PLACES. GREAT STORIES.</span>
            <h2>Your next “remember when?”</h2>
            <p>A few of our favorite journeys, ready to become yours.</p>
          </div>
          <Link className="text-link" to="/tours">
            Explore all tours <ArrowUpRight size={19} />
          </Link>
        </div>
        {tours.isLoading ? (
          <Loading />
        ) : tours.error ? (
          <ErrorState error={tours.error} retry={() => tours.refetch()} />
        ) : (
          <div className="tour-grid">
            {tours.data?.items.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </section>
      <section className="mood-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FOLLOW YOUR FEELING</span>
              <h2>What does your escape look like?</h2>
            </div>
            <span className="handwritten">There’s a journey for that.</span>
          </div>
          <div className="mood-grid">
            {[
              [Mountain, "Adventure", "For your wild side"],
              [Palmtree, "Beach escapes", "A little vitamin sea"],
              [Leaf, "Nature & wildlife", "Back to the good stuff"],
              [Landmark, "Culture & heritage", "Stories around every turn"],
              [Flower2, "Wellness", "Space to just be"],
            ].map(([Icon, title, subtitle]) => {
              const I = Icon as typeof Mountain;
              return (
                <Link
                  to={`/tours?mood=${encodeURIComponent(String(title))}`}
                  key={String(title)}
                  className="mood-card"
                >
                  <I size={29} strokeWidth={1.4} />
                  <strong>{String(title)}</strong>
                  <span>{String(subtitle)}</span>
                  <ArrowUpRight size={17} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A WORLD OF POSSIBILITIES</span>
            <h2>Places that pull you in.</h2>
            <p>From close-to-home wonders to faraway daydreams.</p>
          </div>
          <Link className="text-link" to="/destinations">
            All destinations <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="destination-grid">
          {destinations.data?.slice(0, 4).map((d, i) => (
            <Link
              className="destination-card"
              to={`/tours?destination=${d.id}`}
              key={d.id}
            >
              <img src={d.image} alt={d.name} loading="lazy" />
              <div>
                <span>{d.country}</span>
                <h3>{d.name}</h3>
                <p>
                  {d._count?.tours || 1} curated journeys{" "}
                  <ArrowUpRight size={19} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="story-banner container">
        <div className="story-image">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85"
            alt="A dramatic mountain peak beneath an open sky"
            loading="lazy"
          />
          <span>Take the scenic route.</span>
        </div>
        <div className="story-copy">
          <span className="eyebrow">MORE THAN A PIN ON A MAP</span>
          <h2>
            Travel a little deeper.
            <br />
            Come back a little different.
          </h2>
          <p>
            We believe the best part of a journey isn’t just where you go. It’s
            the people you meet, the things you try, and the moments you never
            saw coming.
          </p>
          <p>
            That’s why we make space for the unexpected, with local hosts,
            smaller groups, and journeys planned with care.
          </p>
          <Link to="/about" className="text-link">
            A little more about us <ArrowUpRight size={19} />
          </Link>
        </div>
      </section>
      <section className="section container reviews-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">POSTCARDS FROM OUR PEOPLE</span>
            <h2>Good trips. Better memories.</h2>
          </div>
          <span className="review-label">
            <Star size={18} fill="currentColor" /> Stories from completed
            journeys
          </span>
        </div>
        <div className="review-grid">
          {reviews.data?.slice(0, 3).map((r) => (
            <article className="quote-card" key={r.id}>
              <div className="stars">{"★".repeat(r.rating)}</div>
              <h3>“{r.title}”</h3>
              <p>{r.comment}</p>
              <div className="review-author">
                <span>{r.user?.name[0]}</span>
                <div>
                  <strong>{r.user?.name}</strong>
                  <small>{r.tour?.title}</small>
                </div>
                <ShieldCheck size={18} />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="last-call">
        <Compass size={34} />
        <span className="eyebrow">YOUR NEXT CHAPTER IS OUT THERE</span>
        <h2>Let’s make a story worth telling.</h2>
        <p>All you need is a little curiosity. We’ll take care of the rest.</p>
        <Link className="btn btn-light" to="/tours">
          Let’s find your adventure <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
