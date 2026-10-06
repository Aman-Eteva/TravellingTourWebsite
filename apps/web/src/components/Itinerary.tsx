import type { ItineraryDay } from "../types";
export function Itinerary({ days }: { days: ItineraryDay[] }) {
  return (
    <div className="itinerary">
      {days.map((day) => (
        <details key={day.day} open={day.day === 1}>
          <summary>
            <span className="day-number">
              {String(day.day).padStart(2, "0")}
            </span>
            <span>
              <small>DAY {day.day}</small>
              <strong>{day.title}</strong>
            </span>
            <span className="plus">+</span>
          </summary>
          <div className="day-detail">
            <p>{day.description}</p>
            <span className="badge">{day.meals}</span>
          </div>
        </details>
      ))}
    </div>
  );
}
