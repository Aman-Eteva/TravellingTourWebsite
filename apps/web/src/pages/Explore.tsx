import { Link, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Clock,
  Users,
  Check,
  ArrowUpRight,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { get, money, date } from "../lib/api";
import type { Tour, Destination, Category } from "../types";
import { TourCard } from "../components/TourCard";
import { Loading, ErrorState, EmptyState } from "../components/ui";
import { Itinerary } from "../components/Itinerary";
export function Explore() {
  const [params, setParams] = useSearchParams();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => get<Category[]>("/categories"),
  });
  const destinations = useQuery({
    queryKey: ["destinations"],
    queryFn: () => get<Destination[]>("/destinations"),
  });
  const queryParams = new URLSearchParams(params);
  const mood = params.get("mood");
  if (mood) {
    const category = categories.data?.find((c) => c.name === mood);
    if (category) queryParams.set("category", category.id);
    queryParams.delete("mood");
  }
  const tours = useQuery({
    queryKey: ["tours", queryParams.toString()],
    queryFn: () =>
      get<{ items: Tour[]; total: number; page: number; pages: number }>(
        `/tours?${queryParams}`,
      ),
  });
  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    p.delete("mood");
    value ? p.set(key, value) : p.delete(key);
    if (key !== "page") p.delete("page");
    setParams(p);
  }
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">THE WORLD IS STILL FULL OF WONDER</span>
        <h1>Find your kind of elsewhere.</h1>
        <p>Thoughtfully crafted journeys. Just waiting for your story.</p>
      </div>
      <div className="explore-layout">
        <aside className="filter-panel">
          <h3>
            <SlidersHorizontal size={18} /> Make it your journey
          </h3>
          <label className="field">
            Search
            <input
              aria-label="Search tours"
              value={params.get("search") || ""}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Where’s calling?"
            />
          </label>
          <label className="field">
            Destination
            <select
              value={params.get("destination") || ""}
              onChange={(e) => set("destination", e.target.value)}
            >
              <option value="">Anywhere beautiful</option>
              {destinations.data?.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Your travel style
            <select
              value={queryParams.get("category") || ""}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">All experiences</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Maximum budget per person
            <input
              type="number"
              min="0"
              value={params.get("maxPrice") || ""}
              onChange={(e) => set("maxPrice", e.target.value)}
              placeholder="₹ Any budget"
            />
          </label>
          <label className="field">
            Minimum budget
            <input
              type="number"
              min="0"
              value={params.get("minPrice") || ""}
              onChange={(e) => set("minPrice", e.target.value)}
              placeholder="₹ 0"
            />
          </label>
          <label className="field">
            Trip length
            <select
              value={params.get("duration") || ""}
              onChange={(e) => set("duration", e.target.value)}
            >
              <option value="">A little or a lot</option>
              <option value="4">Up to 4 days</option>
              <option value="7">Up to a week</option>
              <option value="14">Up to 2 weeks</option>
            </select>
          </label>
          <label className="field">
            Departure date
            <input
              type="date"
              value={params.get("date") || ""}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={params.get("available") === "true"}
              onChange={(e) => set("available", e.target.checked ? "true" : "")}
            />{" "}
            Only available departures
          </label>
          <button className="text-link" onClick={() => setParams({})}>
            Reset filters
          </button>
        </aside>
        <div>
          <div className="results-toolbar">
            <span>
              <strong>{tours.data?.total || 0}</strong> journeys to remember
            </span>
            <select
              aria-label="Sort tours"
              value={params.get("sort") || "newest"}
              onChange={(e) => set("sort", e.target.value)}
            >
              <option value="newest">Recently added</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="duration">Shortest first</option>
            </select>
          </div>
          {tours.isLoading ? (
            <Loading />
          ) : tours.error ? (
            <ErrorState error={tours.error} retry={() => tours.refetch()} />
          ) : tours.data?.items.length ? (
            <div className="tour-grid explore-grid">
              {tours.data.items.map((t) => (
                <TourCard tour={t} key={t.id} />
              ))}
            </div>
          ) : (
            <EmptyState title="A different path, perhaps?">
              <p>Try another destination or loosen your filters.</p>
              <button className="btn" onClick={() => setParams({})}>
                See all journeys
              </button>
            </EmptyState>
          )}
          <div className="pagination">
            {Array.from({ length: tours.data?.pages || 0 }, (_, i) => (
              <button
                className={
                  Number(params.get("page") || 1) === i + 1 ? "active" : ""
                }
                key={i}
                onClick={() => set("page", String(i + 1))}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export function TourDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["tour", id],
    queryFn: () => get<Tour>(`/tours/${id}`),
  });
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  const t = query.data!;
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link to="/tours">Explore tours</Link> / {t.destination.name}
      </div>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {t.category.name} · {t.destination.country}
          </span>
          <h1>{t.title}</h1>
          <p>{t.shortDescription}</p>
        </div>
        <span className="badge">
          <MapPin size={14} />
          {t.destination.name}
        </span>
      </div>
      <img
        className="detail-hero"
        src={t.images[0]?.url}
        alt={t.images[0]?.alt}
      />
      <div className="detail-layout">
        <div>
          <div className="detail-facts">
            <span>
              <Clock />
              {t.duration} days
            </span>
            <span>
              <Users />
              Up to {t.maxTravelers} travelers
            </span>
            <span>
              <ShieldCheck />
              {t.difficulty} pace
            </span>
          </div>
          <section className="detail-section">
            <span className="eyebrow">A LITTLE TASTE OF WHAT’S AHEAD</span>
            <h2>Your next great story.</h2>
            <p>{t.description}</p>
          </section>
          <section className="detail-section" id="itinerary">
            <h2>Every day, a new possibility.</h2>
            <Itinerary days={t.itinerary} />
          </section>
          <section className="detail-section included-grid">
            <div>
              <h3>All taken care of</h3>
              {t.included.map((i) => (
                <p key={i}>
                  <Check size={17} />
                  {i}
                </p>
              ))}
            </div>
            <div>
              <h3>A few things to bring</h3>
              {t.excluded.map((i) => (
                <p key={i}>— {i}</p>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>Somewhere to settle in.</h2>
            {t.hotels.map((h) => (
              <div className="panel" key={h.name}>
                <h3>{h.name}</h3>
                <span className="stars">{"★".repeat(h.stars)}</span>
                <p>{h.address}</p>
              </div>
            ))}
          </section>
          <section className="detail-section">
            <h2>The little details</h2>
            <h4>Let’s meet here</h4>
            <p>{t.meetingPoint}</p>
            <h4>Plans can change</h4>
            <p>{t.cancellationPolicy}</p>
          </section>
          <section className="detail-section">
            <h2>From those who’ve been.</h2>
            {t.reviews.length ? (
              t.reviews.map((r) => (
                <article className="quote-card" key={r.id}>
                  <span className="stars">{"★".repeat(r.rating)}</span>
                  <h3>{r.title}</h3>
                  <p>{r.comment}</p>
                  <strong>{r.user?.name}</strong>
                </article>
              ))
            ) : (
              <p>Be part of this journey’s first stories.</p>
            )}
          </section>
        </div>
        <aside className="booking-summary">
          <span className="eyebrow">YOUR NEXT ADVENTURE</span>
          <div className="big-price">
            {money(t.price)}
            <span> / person</span>
          </div>
          <p>{t.duration} days of a little more extraordinary.</p>
          <hr />
          <h4>Upcoming departures</h4>
          {t.availability
            .filter((a) => new Date(a.date) > new Date())
            .slice(0, 3)
            .map((a) => (
              <div className="departure" key={a.id}>
                <span>{date(a.date)}</span>
                <small>{a.capacity - a.reserved} spots left</small>
              </div>
            ))}
          <Link className="btn full-width" to={`/book/${t.id}`}>
            Make this my next chapter <ArrowUpRight size={17} />
          </Link>
          <span className="summary-note">
            <ShieldCheck size={15} /> Secure booking · Mock payment only
          </span>
          <Link to="/contact" className="text-link">
            Have a question? Talk to us
          </Link>
        </aside>
      </div>
    </div>
  );
}
export function Destinations() {
  const query = useQuery({
    queryKey: ["destinations"],
    queryFn: () => get<Destination[]>("/destinations"),
  });
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
        <h1>So many places. So much possibility.</h1>
        <p>
          Find a corner of the world that feels like it’s calling your name.
        </p>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <div className="destination-page-grid">
          {query.data?.map((d) => (
            <Link
              className="destination-card"
              key={d.id}
              to={`/tours?destination=${d.id}`}
            >
              <img src={d.image} alt={d.name} />
              <div>
                <span>{d.country}</span>
                <h3>{d.name}</h3>
                <p>{d.description}</p>
                <span>
                  {d._count?.tours} journeys <ArrowUpRight size={18} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
