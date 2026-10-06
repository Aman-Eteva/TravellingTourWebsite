import { Link, useNavigate } from "react-router-dom";
import { Heart, MapPin, Clock, ArrowUpRight, Star } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { Tour } from "../types";
import { money, api, get, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "./ui";
export function TourCard({ tour }: { tour: Tour }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const { data: wishlist } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => get<{ tour: Tour }[]>("/wishlist"),
    enabled: !!user,
  });
  const saved = wishlist?.some((w) => w.tour.id === tour.id);
  async function toggle() {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      if (saved) await api.delete(`/wishlist/${tour.id}`);
      else await api.post("/wishlist", { tourId: tour.id });
      await client.invalidateQueries({ queryKey: ["wishlist"] });
      toast(
        saved ? "Removed from your wishlist" : "Saved for a future adventure",
      );
    } catch (error) {
      toast(errorMessage(error), true);
    }
  }
  const rating = tour.reviews.length
    ? (
        tour.reviews.reduce((s, r) => s + r.rating, 0) / tour.reviews.length
      ).toFixed(1)
    : null;
  return (
    <article className="tour-card">
      <div className="tour-image">
        <Link to={`/tours/${tour.slug}`}>
          <img
            src={tour.images[0]?.url}
            alt={tour.images[0]?.alt || tour.title}
            loading="lazy"
          />
        </Link>
        <span className="image-tag">{tour.category.name}</span>
        <button
          onClick={toggle}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          className={`heart-button ${saved ? "saved" : ""}`}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="tour-body">
        <div className="tour-meta">
          <span>
            <MapPin size={13} />
            {tour.destination.name}, {tour.destination.country}
          </span>
          {rating && (
            <span className="rating">
              <Star size={13} fill="currentColor" />
              {rating}
            </span>
          )}
        </div>
        <Link to={`/tours/${tour.slug}`}>
          <h3>{tour.title}</h3>
        </Link>
        <p>{tour.shortDescription}</p>
        <div className="tour-bottom">
          <div>
            <span className="muted small">From </span>
            <strong>{money(tour.price)}</strong>
            <span className="muted small"> / person</span>
            <span className="duration">
              <Clock size={13} />
              {tour.duration} days · Small group
            </span>
          </div>
          <Link
            className="circle-link"
            aria-label={`View ${tour.title}`}
            to={`/tours/${tour.slug}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
      </div>
    </article>
  );
}
