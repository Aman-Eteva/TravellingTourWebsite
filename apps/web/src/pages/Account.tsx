import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Heart,
  Sparkles,
  MapPin,
  Bell,
  CheckCircle2,
  Star,
} from "lucide-react";
import { api, get, money, date, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Booking, Tour, Notice, Review } from "../types";
import {
  Loading,
  ErrorState,
  EmptyState,
  Badge,
  ActionForm,
  Field,
  Modal,
  useToast,
} from "../components/ui";
import { TourCard } from "../components/TourCard";
import { Itinerary } from "../components/Itinerary";
export function Dashboard() {
  const { user } = useAuth();
  const bookings = useQuery({
    queryKey: ["bookings"],
    queryFn: () => get<Booking[]>("/bookings"),
  });
  const upcoming = bookings.data?.filter((b) => b.status === "CONFIRMED") || [];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">HERE’S TO WHAT’S NEXT</span>
        <h1>Your world, a little wider.</h1>
        <p>All your adventures, in one happy place.</p>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <CalendarDays />
          <strong>{upcoming.length}</strong>
          <span>Adventures ahead</span>
        </div>
        <div className="stat">
          <MapPin />
          <strong>
            {bookings.data?.filter((b) => b.status === "COMPLETED").length || 0}
          </strong>
          <span>Stories already made</span>
        </div>
        <Link className="stat assistant-stat" to="/assistant">
          <Sparkles />
          <h3>Your travel sidekick</h3>
          <span>
            Ask a little. Discover a lot. <ArrowUpRight size={17} />
          </span>
        </Link>
      </div>
      <div className="section-heading">
        <h2>On your horizon</h2>
        <Link className="text-link" to="/bookings">
          All bookings <ArrowUpRight size={17} />
        </Link>
      </div>
      {bookings.isLoading ? (
        <Loading />
      ) : bookings.error ? (
        <ErrorState error={bookings.error} />
      ) : upcoming.length ? (
        upcoming.slice(0, 2).map((b) => <BookingCard key={b.id} booking={b} />)
      ) : (
        <EmptyState title="Your next story is unwritten.">
          <p>Let’s find a journey with your name on it.</p>
          <Link className="btn" to="/tours">
            Explore journeys
          </Link>
        </EmptyState>
      )}
      <div className="account-banner">
        <h2>Save a little daydream for later.</h2>
        <p>
          Your wishlist is the perfect place for all those “one day” adventures.
        </p>
        <Link className="text-link" to="/wishlist">
          Open my wishlist <Heart size={17} />
        </Link>
      </div>
    </>
  );
}
export function BookingCard({ booking: b }: { booking: Booking }) {
  return (
    <article className="booking-card">
      <img src={b.tour.images[0]?.url} alt={b.tour.title} />
      <div>
        <div className="booking-card-top">
          <span className="eyebrow">{b.reference}</span>
          <Badge>{b.status}</Badge>
        </div>
        <h3>{b.tour.title}</h3>
        <p>
          <CalendarDays size={15} />
          {date(b.travelDate)} · {b.tour.duration} days · {b.count} traveler
          {b.count > 1 ? "s" : ""}
        </p>
        <div className="booking-card-bottom">
          <strong>{money(b.total)}</strong>
          <Link className="text-link" to={`/bookings/${b.id}`}>
            Your trip details <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Bookings({ trips = false }: { trips?: boolean }) {
  const query = useQuery({
    queryKey: ["bookings"],
    queryFn: () => get<Booking[]>("/bookings"),
  });
  const [filter, setFilter] = useState("ALL");
  const items = query.data?.filter(
    (b) =>
      (!trips || ["CONFIRMED", "COMPLETED"].includes(b.status)) &&
      (filter === "ALL" || b.status === filter),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          {trips
            ? "PLACES YOU’LL GO, MEMORIES YOU’LL KEEP"
            : "EVERY ADVENTURE STARTS SOMEWHERE"}
        </span>
        <h1>
          {trips
            ? "Your journeys. Your stories."
            : "Your little collection of escapes."}
        </h1>
      </div>
      <div className="tabs">
        {["ALL", "CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"]
          .filter((x) => !trips || !["PENDING", "CANCELLED"].includes(x))
          .map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={filter === s ? "active" : ""}
            >
              {s.toLowerCase()}
            </button>
          ))}
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : items?.length ? (
        items.map((b) => <BookingCard key={b.id} booking={b} />)
      ) : (
        <EmptyState title="Nothing here just yet.">
          <Link to="/tours" className="btn">
            Find your next journey
          </Link>
        </EmptyState>
      )}
    </>
  );
}
export function BookingDetail() {
  const { id } = useParams();
  const client = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState("SUCCESS");
  const [paymentKey, setPaymentKey] = useState(crypto.randomUUID());
  const query = useQuery({
    queryKey: ["booking", id],
    queryFn: () => get<Booking>(`/bookings/${id}`),
  });
  async function refresh() {
    await client.invalidateQueries({ queryKey: ["booking", id] });
    await client.invalidateQueries({ queryKey: ["bookings"] });
  }
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  const b = query.data!;
  return (
    <>
      <Link className="text-link" to="/bookings">
        ← Your bookings
      </Link>
      <div className="page-heading">
        <span className="eyebrow">{b.reference}</span>
        <h1>{b.tour.title}</h1>
        <Badge>{b.status}</Badge>
      </div>
      <img
        className="trip-cover"
        src={b.tour.images[0]?.url}
        alt={b.tour.title}
      />
      <div className="stat-grid">
        <div className="stat">
          <span>We’re going on</span>
          <strong className="stat-date">{date(b.travelDate)}</strong>
          <span>{b.tour.duration} days</span>
        </div>
        <div className="stat">
          <span>Your travel party</span>
          <strong>{b.count}</strong>
          <span>curious traveler{b.count > 1 ? "s" : ""}</span>
        </div>
        <div className="stat">
          <span>Your total</span>
          <strong className="stat-date">{money(b.total)}</strong>
          <Badge>{b.paymentStatus}</Badge>
        </div>
      </div>
      {b.status === "PENDING" && (
        <section className="panel">
          <h2>Save your place in the story.</h2>
          <div className="notice">
            Demo Payment — No real money will be charged.
          </div>
          <p>
            Your reservation expires{" "}
            {b.expiresAt ? new Date(b.expiresAt).toLocaleString() : ""}.
          </p>
          <label className="field">
            Mock payment result
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </label>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.post("/payments/mock", {
                  bookingId: b.id,
                  status: outcome,
                  idempotencyKey: paymentKey,
                });
                setPaymentKey(crypto.randomUUID());
                await refresh();
                toast(`Demo payment ${outcome.toLowerCase()}.`);
              } catch (error) {
                toast(errorMessage(error), true);
              } finally {
                setBusy(false);
              }
            }}
          >
            Simulate payment
          </button>
        </section>
      )}
      <section className="detail-section">
        <h2>Your people</h2>
        {b.travelers.map((t, i) => (
          <p key={i}>
            {t.name} · {t.age} years {t.email && `· ${t.email}`}
          </p>
        ))}
      </section>
      <section className="detail-section">
        <h2>The journey, day by day.</h2>
        <Itinerary days={b.tour.itinerary} />
      </section>
      <section className="detail-section">
        <h2>Your home away from home</h2>
        {b.tour.hotels.map((h) => (
          <div className="panel" key={h.name}>
            <h3>{h.name}</h3>
            <p>
              {h.address} · {h.stars} stars
            </p>
          </div>
        ))}
        <h3>Meeting point</h3>
        <p>{b.tour.meetingPoint}</p>
      </section>
      <section className="panel">
        <h3>A note on changing plans</h3>
        <p>{b.tour.cancellationPolicy}</p>
        <p>
          Cancellation deadline:{" "}
          {b.cancellation && date(b.cancellation.deadline)}
        </p>
        <p>
          Estimated mock refund: {money(b.cancellation?.estimatedRefund || 0)}
        </p>
        {b.cancellation?.eligible ? (
          <button
            className="btn btn-outline danger"
            onClick={() => setConfirm(true)}
          >
            Cancel this booking
          </button>
        ) : (
          <p>
            {b.status === "CANCELLED"
              ? `Cancelled · Mock refund recorded: ${money(b.refund)}`
              : "This booking is not eligible for cancellation."}
          </p>
        )}
      </section>
      <section className="detail-section">
        <h2>Mock payment history</h2>
        {b.payments.map((p) => (
          <div className="payment-row" key={p.id}>
            <span>{date(p.createdAt)}</span>
            <Badge>{p.status}</Badge>
            <strong>{money(p.amount)}</strong>
          </div>
        ))}
      </section>
      {b.status === "COMPLETED" && !b.review && (
        <section className="panel">
          <h2>How was your adventure?</h2>
          <ReviewForm bookingId={b.id} onDone={refresh} />
        </section>
      )}
      {confirm && (
        <Modal title="A change of plans?" onClose={() => setConfirm(false)}>
          <p>
            Cancel {b.reference}? Your places will be released and a mock refund
            of {money(b.cancellation?.estimatedRefund || 0)} will be recorded.
          </p>
          <div className="button-row">
            <button
              className="btn btn-outline"
              onClick={() => setConfirm(false)}
            >
              Keep my adventure
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.post(`/bookings/${b.id}/cancel`);
                  setConfirm(false);
                  await refresh();
                  toast(
                    "Booking cancelled. Your mock refund has been recorded.",
                  );
                } catch (error) {
                  toast(errorMessage(error), true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm cancellation
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function ReviewForm({
  bookingId,
  onDone,
}: {
  bookingId: string;
  onDone: () => Promise<unknown>;
}) {
  const toast = useToast();
  return (
    <ActionForm
      button="Share my story"
      onSubmit={async (f) => {
        await api.post("/reviews", {
          bookingId,
          rating: Number(f.get("rating")),
          title: f.get("title"),
          comment: f.get("comment"),
        });
        toast("Thank you for sharing your story.");
        await onDone();
      }}
    >
      <label className="field">
        Your rating
        <select name="rating">
          {[5, 4, 3, 2, 1].map((i) => (
            <option key={i} value={i}>
              {i} stars
            </option>
          ))}
        </select>
      </label>
      <Field label="A few words to sum it up" name="title" />
      <label className="field">
        Your experience
        <textarea name="comment" required minLength={10} maxLength={2000} />
      </label>
    </ActionForm>
  );
}
export function Wishlist() {
  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => get<{ id: string; tour: Tour }[]>("/wishlist"),
  });
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR “ONE DAY” COLLECTION</span>
        <h1>A little room for daydreams.</h1>
        <p>The journeys you love, saved for when the time is right.</p>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data?.length ? (
        <div className="tour-grid account-tour-grid">
          {query.data.map((w) => (
            <TourCard tour={w.tour} key={w.id} />
          ))}
        </div>
      ) : (
        <EmptyState title="Save a little inspiration.">
          <p>Tap the heart on a tour and find it here.</p>
          <Link to="/tours" className="btn">
            Find something to love
          </Link>
        </EmptyState>
      )}
    </>
  );
}
export function Notifications() {
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => get<Notice[]>("/notifications"),
  });
  const toast = useToast();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">A LITTLE SOMETHING FOR YOU</span>
        <h1>You’ve got travel mail.</h1>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data?.length ? (
        query.data.map((n) => (
          <article
            className={`notification ${n.read ? "read" : ""}`}
            key={n.id}
          >
            <Bell size={21} />
            <div>
              <span className="muted small">{date(n.createdAt)}</span>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <div className="button-row">
                {n.link && (
                  <Link className="text-link" to={n.link}>
                    Take a look <ArrowUpRight size={16} />
                  </Link>
                )}
                {!n.read && (
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await api.patch(`/notifications/${n.id}/read`);
                        await query.refetch();
                      } catch (error) {
                        toast(errorMessage(error), true);
                      }
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </article>
        ))
      ) : (
        <EmptyState title="All quiet for now.">
          <p>We’ll keep your trip updates here.</p>
        </EmptyState>
      )}
    </>
  );
}
export function Profile() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">THE PERSON BEHIND THE ADVENTURES</span>
        <h1>A little about you.</h1>
      </div>
      <section className="panel">
        <h2>Your details</h2>
        <ActionForm
          onSubmit={async (f) => {
            await api.patch("/auth/profile", {
              name: f.get("name"),
              phone: f.get("phone"),
            });
            await refresh();
            toast("Profile updated.");
          }}
        >
          <Field name="name" label="Full name" value={user?.name} />
          <Field
            name="phone"
            label="Phone number"
            value={user?.phone || ""}
            required={false}
          />
          <label className="field">
            Email address
            <input value={user?.email || ""} readOnly />
          </label>
        </ActionForm>
      </section>
      <section className="panel">
        <h2>Keep your account secure</h2>
        <ActionForm
          button="Update password"
          onSubmit={async (f) => {
            await api.post("/auth/change-password", {
              currentPassword: f.get("currentPassword"),
              password: f.get("password"),
            });
            toast("Password updated. Please sign in again.");
            await logout();
          }}
        >
          <Field
            name="currentPassword"
            label="Current password"
            type="password"
          />
          <Field
            name="password"
            label="New password (at least 10 characters)"
            type="password"
          />
        </ActionForm>
      </section>
    </>
  );
}
export function MyReviews() {
  const query = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => get<Review[]>("/my-reviews"),
  });
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR WORDS, THEIR NEXT ADVENTURE</span>
        <h1>The stories you’ve shared.</h1>
        <p>Review completed journeys from their booking details.</p>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data?.length ? (
        query.data.map((r) => (
          <article className="quote-card" key={r.id}>
            <span className="stars">{"★".repeat(r.rating)}</span>
            <h3>{r.title}</h3>
            <p>{r.comment}</p>
            <span className="muted">{r.tour?.title}</span>
          </article>
        ))
      ) : (
        <EmptyState title="Your stories are worth sharing.">
          <Link className="btn" to="/bookings">
            See completed journeys
          </Link>
        </EmptyState>
      )}
    </>
  );
}
