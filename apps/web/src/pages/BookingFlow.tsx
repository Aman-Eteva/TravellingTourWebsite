import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Plus,
  Check,
  ShieldCheck,
  CalendarDays,
  Users,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { get, api, money, date, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Tour, Booking } from "../types";
import { Loading, ErrorState, useToast } from "../components/ui";
export function BookingFlow() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["tour", id],
    queryFn: () => get<Tour>(`/tours/${id}`),
  });
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  return <BookingForm key={query.data!.id} tour={query.data!} />;
}
function BookingForm({ tour }: { tour: Tour }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState("");
  const [travelers, setTravelers] = useState(() =>
    Array.from({ length: tour.minTravelers }, (_, i) => ({
      name: i === 0 ? user?.name || "" : "",
      age: 25,
      email: i === 0 ? user?.email || "" : "",
    })),
  );
  const count = travelers.length;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [outcome, setOutcome] = useState("SUCCESS");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(crypto.randomUUID());
  const availability = tour.availability.filter(
    (a) => new Date(a.date) > new Date() && a.capacity - a.reserved >= count,
  );
  const selected = availability.find((a) => a.id === slot);
  const partyLimit = Math.min(tour.maxTravelers, selected ? selected.capacity - selected.reserved : tour.maxTravelers);
  function resizeParty(n: number) {
    if (n < tour.minTravelers || n > tour.maxTravelers) return;
    setTravelers((current) => Array.from({ length: n }, (_, i) => current[i] || { name: "", age: 25, email: "" }));
    if (selected && selected.capacity - selected.reserved < n) setSlot("");
  }
  async function reserve() {
    if (!selected) {
      toast("Please choose a departure with enough places for everyone.", true);
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<Booking>("/bookings", {
        tourId: tour.id,
        availabilityId: slot,
        travelers: travelers.map((t) => ({
          ...t,
          email: t.email || undefined,
        })),
      });
      setBooking(result.data);
      setStep(3);
      await client.invalidateQueries({ queryKey: ["bookings"] });
    } catch (error) {
      toast(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    try {
      await api.post("/payments/mock", {
        bookingId: booking!.id,
        status: outcome,
        idempotencyKey: key,
      });
      setKey(crypto.randomUUID());
      await client.invalidateQueries({ queryKey: ["bookings"] });
      if (outcome === "SUCCESS") setStep(4);
      else
        toast(
          outcome === "FAILED"
            ? "Demo payment failed. You can retry."
            : "Demo payment is pending. You can simulate its success before the reservation expires.",
          outcome === "FAILED",
        );
    } catch (error) {
      toast(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link to={`/tours/${tour.slug}`}>{tour.title}</Link> / Your adventure
      </div>
      <div className="page-heading">
        <span className="eyebrow">A FEW LITTLE DETAILS, THEN YOU’RE OFF</span>
        <h1>
          {step === 4
            ? "It’s happening. You’re going."
            : "Let’s make this journey yours."}
        </h1>
      </div>
      <ol className="booking-steps">
        {[
          "Your departure",
          "Your people",
          "One last look",
          "Demo payment",
          "You’re booked",
        ].map((label, i) => (
          <li className={i <= step ? "active" : ""} key={label}>
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="checkout-layout">
        <div className="panel checkout-panel">
          {step === 0 && (
            <>
              <h2>When does your story begin?</h2>
              <p>Pick a date and bring your favorite people.</p>
              <label className="field">
                Number of travelers
                <select
                  value={count}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    resizeParty(n);
                  }}
                >
                  {Array.from(
                    { length: tour.maxTravelers - tour.minTravelers + 1 },
                    (_, i) => (
                      <option key={i} value={i + tour.minTravelers}>
                        {i + tour.minTravelers} traveler
                        {i + tour.minTravelers > 1 ? "s" : ""}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <p>Booking for your family? Include yourself and every adult and child in the traveler count.</p>
              <div className="date-options">
                {availability.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSlot(a.id)}
                    className={slot === a.id ? "selected" : ""}
                  >
                    <CalendarDays size={19} />
                    <strong>{date(a.date)}</strong>
                    <span>{a.capacity - a.reserved} places left</span>
                  </button>
                ))}
              </div>
              {!availability.length && (
                <p>No departures have enough places for this group size.</p>
              )}
              <button
                className="btn"
                disabled={!selected}
                onClick={() => setStep(1)}
              >
                Meet your travel party <ArrowRight size={17} />
              </button>
            </>
          )}
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selected) setStep(2);
                else setStep(0);
              }}
            >
              <h2>Who’s coming along?</h2>
              <p>A little about each traveler, so we can plan with care.</p>
              <div className="family-party-controls">
                <strong aria-live="polite">{count} traveler{count === 1 ? "" : "s"} in your booking</strong>
                <button type="button" className="btn btn-outline" disabled={!selected || count >= partyLimit} onClick={() => resizeParty(count + 1)}>
                  <Plus size={18} /> Add family member
                </button>
                <p>Include children too. Each traveler is charged the displayed per-person price; additional emails are optional.</p>
                {count >= partyLimit && <p>{count >= tour.maxTravelers ? `This tour allows up to ${tour.maxTravelers} travelers per booking.` : "This departure has no more places for your group. Choose another date to add more people."}</p>}
                <button type="button" className="text-link" onClick={() => setStep(0)}>Change departure or group size</button>
              </div>
              {travelers.map((t, i) => (
                <fieldset key={i} className="traveler-fields">
                  <legend>
                    Traveler {i + 1}
                    {i === 0 ? " · Lead traveler" : ""}
                  </legend>
                  <label className="field">
                    Full name
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={t.name}
                      onChange={(e) =>
                        setTravelers(
                          travelers.map((v, j) =>
                            j === i ? { ...v, name: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Age
                    <input
                      required
                      type="number"
                      min="0"
                      max="120"
                      value={t.age}
                      onChange={(e) =>
                        setTravelers(
                          travelers.map((v, j) =>
                            j === i ? { ...v, age: Number(e.target.value) } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Email {i > 0 ? "(optional)" : ""}
                    <input
                      type="email"
                      required={i === 0}
                      value={t.email}
                      onChange={(e) =>
                        setTravelers(
                          travelers.map((v, j) =>
                            j === i ? { ...v, email: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  {i > 0 && <button type="button" className="btn btn-outline" disabled={count <= tour.minTravelers} aria-label={`Remove traveler ${i + 1}`} onClick={() => setTravelers((current) => current.filter((_, index) => index !== i))}>Remove traveler</button>}
                </fieldset>
              ))}
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStep(0)}
                >
                  Back
                </button>
                <button className="btn">
                  Review my adventure <ArrowRight size={17} />
                </button>
              </div>
            </form>
          )}
          {step === 2 && (
            <>
              <h2>Looking good?</h2>
              <p>Check the details before we save your places.</p>
              <div className="review-details">
                <h3>{tour.title}</h3>
                <p>
                  <CalendarDays size={17} />
                  {selected && date(selected.date)}
                </p>
                {travelers.map((t, i) => (
                  <p key={i}>
                    <Users size={17} />
                    {t.name} · {t.age} years
                  </p>
                ))}
              </div>
              <div className="notice">
                {tour.cancellationPolicy} Your places are held for 30 minutes
                while you complete the demo payment.
              </div>
              <div className="button-row">
                <button className="btn btn-outline" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn" disabled={busy} onClick={reserve}>
                  {busy ? "Saving your places…" : "Continue to demo payment"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <CreditCard size={32} />
              <h2>One last step to somewhere new.</h2>
              <div className="notice payment-notice">
                Demo Payment — No real money will be charged.
              </div>
              <p>
                This is a simulated checkout. No card or bank details are
                needed.
              </p>
              <label className="field">
                Simulate payment result
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="SUCCESS">Success — confirm my booking</option>
                  <option value="FAILED">Failed — try again later</option>
                  <option value="PENDING">
                    Pending — awaiting confirmation
                  </option>
                </select>
              </label>
              <p>
                Reservation: <strong>{booking?.reference}</strong>
              </p>
              <button className="btn full-width" disabled={busy} onClick={pay}>
                {busy
                  ? "Processing demo payment…"
                  : `Simulate ${money(booking?.total || 0)} payment`}
                <ShieldCheck size={18} />
              </button>
              <button
                className="text-link"
                onClick={() => navigate(`/bookings/${booking!.id}`)}
              >
                Finish later in My bookings
              </button>
            </>
          )}
          {step === 4 && (
            <div className="confirmation">
              <CheckCircle2 size={58} />
              <h2>Your next chapter is confirmed.</h2>
              <p>{tour.title}, here you come.</p>
              <div className="booking-reference">{booking?.reference}</div>
              <p>
                All your trip details and itinerary are waiting in your account.
              </p>
              <Link className="btn" to={`/bookings/${booking!.id}`}>
                See my adventure <ArrowUpRightIcon />
              </Link>
            </div>
          )}
        </div>
        <aside className="booking-summary">
          <img src={tour.images[0]?.url} alt={tour.title} />
          <span className="eyebrow">YOUR LITTLE ESCAPE</span>
          <h3>{tour.title}</h3>
          <p>
            {tour.duration} days · {tour.destination.name}
          </p>
          <hr />
          <p className="family-summary-count" aria-live="polite"><Users size={18} /> {count} traveler{count === 1 ? "" : "s"} · {money(tour.price)} per person</p>
          <div className="price-line">
            <span>
              {money(tour.price)} × {count} traveler{count > 1 ? "s" : ""}
            </span>
            <strong>{money(tour.price * count)}</strong>
          </div>
          <div className="price-line">
            <span>Booking fees</span>
            <span>On us</span>
          </div>
          <hr />
          <div className="price-line total">
            <strong>Your total</strong>
            <strong>{money(tour.price * count)}</strong>
          </div>
          <span className="summary-note">
            <ShieldCheck size={16} /> Every detail, thoughtfully taken care of.
          </span>
        </aside>
      </div>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={18} />;
}
