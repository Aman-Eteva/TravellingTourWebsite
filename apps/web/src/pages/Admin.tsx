import { useState } from "react";
import { NavLink, Outlet, Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Users,
  Map,
  CalendarDays,
  BookOpen,
  Star,
  Sparkles,
  Bell,
  Shield,
  Plus,
  ArrowUpRight,
  Edit2,
  Trash2,
  RefreshCw,
  Mail,
  Tag,
} from "lucide-react";
import { api, get, money, date, errorMessage } from "../lib/api";
import type {
  Tour,
  User,
  Destination,
  Category,
  Availability,
  Booking,
  Review,
  Notice,
  Document,
  ItineraryDay,
} from "../types";
import {
  Loading,
  ErrorState,
  EmptyState,
  Modal,
  ActionForm,
  Field,
  Badge,
  useToast,
} from "../components/ui";
const links = [
  ["", "Overview", BarChart3],
  ["users", "Travelers", Users],
  ["tours", "Tours", Map],
  ["destinations", "Destinations", Map],
  ["categories", "Categories", Tag],
  ["availability", "Departures", CalendarDays],
  ["bookings", "Bookings", BookOpen],
  ["reviews", "Reviews", Star],
  ["rag", "Travel knowledge", Sparkles],
  ["notifications", "Notifications", Bell],
  ["contacts", "Contact inbox", Mail],
  ["audit-logs", "Audit log", Shield],
] as const;
export function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="eyebrow">ROAMLY STUDIO</span>
          <h2>Behind the journeys.</h2>
        </div>
        <nav>
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={`/admin${to ? `/${to}` : ""}`} end>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="text-link" to="/">
          Visit your storefront <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
export function AdminDashboard() {
  const q = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => get<Record<string, number>>("/admin/stats"),
  });
  const recent = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => get<Booking[]>("/admin/bookings"),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  const s = q.data!;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">THE BIG PICTURE</span>
        <h1>Good journeys start here.</h1>
        <p>A little perspective on your travel community.</p>
      </div>
      <div className="admin-stat-grid">
        {[
          ["Travelers", s.users],
          ["Tours", s.tours],
          ["Bookings", s.bookings],
          ["Mock revenue", money(s.revenue)],
          ["Confirmed", s.confirmed],
          ["Cancelled", s.cancelled],
          ["Completed trips", s.completed],
          ["Upcoming trips", s.upcoming],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Journeys at a glance</h2>
        <div className="bar-chart">
          {[
            ["Confirmed", s.confirmed],
            ["Completed", s.completed],
            ["Cancelled", s.cancelled],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <div>
                <i
                  style={{
                    width: `${Math.max(2, (Number(value) / Math.max(s.bookings, 1)) * 100)}%`,
                  }}
                />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="section-heading">
        <h2>Latest bookings</h2>
        <Link className="text-link" to="/admin/bookings">
          View all <ArrowUpRight size={18} />
        </Link>
      </div>
      <DataTable
        headers={["Reference", "Traveler", "Journey", "Status", "Total"]}
        rows={
          recent.data
            ?.slice(0, 6)
            .map((b) => [
              b.reference,
              b.user?.name,
              b.tour.title,
              <Badge>{b.status}</Badge>,
              money(b.total),
            ]) || []
        }
      />
    </>
  );
}
function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <EmptyState title="Nothing here yet." />}
    </div>
  );
}
export function AdminUsers() {
  const query = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => get<User[]>("/admin/users"),
  });
  const toast = useToast();
  const [search, setSearch] = useState("");
  async function update(id: string, data: object) {
    try {
      await api.patch(`/admin/users/${id}`, data);
      await query.refetch();
      toast("Traveler account updated.");
    } catch (e) {
      toast(errorMessage(e), true);
    }
  }
  return (
    <>
      <PageTitle
        title="Your travel community."
        subtitle="Manage account access and roles."
      />
      <input
        className="admin-search"
        aria-label="Search users"
        placeholder="Find a traveler by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <DataTable
          headers={["Traveler", "Email", "Role", "Access", "Actions"]}
          rows={
            query.data
              ?.filter((u) =>
                `${u.name} ${u.email}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((u) => [
                u.name,
                u.email,
                <select
                  aria-label={`Role for ${u.name}`}
                  value={u.role}
                  onChange={(e) => update(u.id, { role: e.target.value })}
                >
                  <option>CUSTOMER</option>
                  <option>ADMIN</option>
                </select>,
                <Badge>{u.active ? "ACTIVE" : "DISABLED"}</Badge>,
                <button
                  className="text-link"
                  onClick={() => update(u.id, { active: !u.active })}
                >
                  {u.active ? "Disable account" : "Enable account"}
                </button>,
              ]) || []
          }
        />
      )}
    </>
  );
}
function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading admin-page-title">
      <div>
        <span className="eyebrow">ROAMLY STUDIO</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function AdminTours() {
  const query = useQuery({
    queryKey: ["admin", "tours"],
    queryFn: () => get<Tour[]>("/admin/tours"),
  });
  const toast = useToast();
  const [editing, setEditing] = useState<Tour | null | undefined>(undefined);
  const [details, setDetails] = useState<Tour | null>(null);
  const [archive, setArchive] = useState<Tour | null>(null);
  return (
    <>
      <PageTitle
        title="Journeys worth taking."
        subtitle="Create, refine and publish your collection."
        action={
          <button className="btn" onClick={() => setEditing(null)}>
            <Plus size={17} /> Create a tour
          </button>
        }
      />
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <DataTable
          headers={[
            "Tour",
            "Destination",
            "Price",
            "Duration",
            "Status",
            "Actions",
          ]}
          rows={
            query.data?.map((t) => [
              <div className="table-tour">
                <img src={t.images[0]?.url} alt="" />
                <strong>{t.title}</strong>
              </div>,
              t.destination.name,
              money(t.price),
              `${t.duration} days`,
              <Badge>{t.status}</Badge>,
              <div className="table-actions">
                <button className="text-link" onClick={() => setEditing(t)}>
                  Edit
                </button>
                <button className="text-link" onClick={() => setDetails(t)}>
                  Itinerary & stays
                </button>
                <button
                  className="text-link danger"
                  onClick={() => setArchive(t)}
                >
                  Archive
                </button>
              </div>,
            ]) || []
          }
        />
      )}{" "}
      {editing !== undefined && (
        <Modal
          title={editing ? "Refine this journey" : "Create a new journey"}
          onClose={() => setEditing(undefined)}
        >
          <TourEditor
            tour={editing}
            onDone={async () => {
              setEditing(undefined);
              await query.refetch();
            }}
          />
        </Modal>
      )}
      {details && (
        <Modal title="The journey in detail" onClose={() => setDetails(null)}>
          <TourDetailsEditor
            tour={details}
            onDone={async () => {
              await query.refetch();
              setDetails(null);
            }}
          />
        </Modal>
      )}
      {archive && (
        <Modal title="Archive this journey?" onClose={() => setArchive(null)}>
          <p>
            {archive.title} will be removed from tour discovery. Existing
            bookings will remain available.
          </p>
          <button
            className="btn"
            onClick={async () => {
              try {
                await api.delete(`/admin/tours/${archive.id}`);
                setArchive(null);
                await query.refetch();
                toast("Tour archived.");
              } catch (e) {
                toast(errorMessage(e), true);
              }
            }}
          >
            Archive tour
          </button>
        </Modal>
      )}
    </>
  );
}
function TourEditor({
  tour: t,
  onDone,
}: {
  tour: Tour | null;
  onDone: () => Promise<void>;
}) {
  const destinations = useQuery({
    queryKey: ["destinations"],
    queryFn: () => get<Destination[]>("/destinations"),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => get<Category[]>("/categories"),
  });
  const toast = useToast();
  return (
    <ActionForm
      button={t ? "Save journey" : "Create journey"}
      onSubmit={async (f) => {
        const data = {
          title: f.get("title"),
          slug: f.get("slug"),
          description: f.get("description"),
          shortDescription: f.get("shortDescription"),
          destinationId: f.get("destinationId"),
          categoryId: f.get("categoryId"),
          price: Math.round(Number(f.get("price")) * 100),
          duration: Number(f.get("duration")),
          minTravelers: Number(f.get("minTravelers")),
          maxTravelers: Number(f.get("maxTravelers")),
          difficulty: f.get("difficulty"),
          meetingPoint: f.get("meetingPoint"),
          included: String(f.get("included")).split("\n").filter(Boolean),
          excluded: String(f.get("excluded")).split("\n").filter(Boolean),
          cancellationPolicy: f.get("cancellationPolicy"),
          cancellationDays: Number(f.get("cancellationDays")),
          refundPercent: Number(f.get("refundPercent")),
          status: f.get("status"),
          featured: f.get("featured") === "on",
          image: f.get("image") || undefined,
        };
        await (t
          ? api.put(`/admin/tours/${t.id}`, data)
          : api.post("/admin/tours", data));
        toast("Journey saved.");
        await onDone();
      }}
    >
      <div className="two-columns">
        <Field name="title" label="Tour title" value={t?.title} />
        <Field
          name="slug"
          label="URL slug (lowercase-with-hyphens)"
          value={t?.slug}
        />
      </div>
      <Field
        name="shortDescription"
        label="Short description"
        value={t?.shortDescription}
      />
      <label className="field">
        The full story
        <textarea
          name="description"
          defaultValue={t?.description}
          required
          minLength={20}
        />
      </label>
      <div className="two-columns">
        <label className="field">
          Destination
          <select name="destinationId" defaultValue={t?.destinationId} required>
            {destinations.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Category
          <select name="categoryId" defaultValue={t?.categoryId} required>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="price"
          label="Price per person (₹)"
          type="number"
          min={1}
          value={t ? t.price / 100 : 15000}
        />
        <Field
          name="duration"
          label="Duration in days"
          type="number"
          min={1}
          max={90}
          value={t?.duration || 5}
        />
        <Field
          name="minTravelers"
          label="Minimum travelers"
          type="number"
          min={1}
          value={t?.minTravelers || 1}
        />
        <Field
          name="maxTravelers"
          label="Maximum travelers"
          type="number"
          min={1}
          max={30}
          value={t?.maxTravelers || 12}
        />
      </div>
      <Field
        name="image"
        label="Cover image URL"
        type="url"
        value={t?.images[0]?.url}
      />
      <Field
        name="meetingPoint"
        label="Meeting point"
        value={t?.meetingPoint}
      />
      <div className="two-columns">
        <label className="field">
          Included (one per line)
          <textarea
            name="included"
            defaultValue={
              t?.included.join("\n") || "Accommodation\nBreakfast\nLocal guide"
            }
          />
        </label>
        <label className="field">
          Excluded (one per line)
          <textarea
            name="excluded"
            defaultValue={t?.excluded.join("\n") || "Flights\nTravel insurance"}
          />
        </label>
      </div>
      <label className="field">
        Cancellation policy
        <textarea
          name="cancellationPolicy"
          required
          defaultValue={
            t?.cancellationPolicy ||
            "Cancel at least 7 days before departure for a 100% mock refund."
          }
        />
      </label>
      <div className="two-columns">
        <Field
          name="cancellationDays"
          label="Cancellation deadline (days before trip)"
          type="number"
          min={0}
          max={90}
          value={t?.cancellationDays ?? 7}
        />
        <Field
          name="refundPercent"
          label="Mock refund percentage"
          type="number"
          min={0}
          max={100}
          value={t?.refundPercent ?? 100}
        />
        <label className="field">
          Difficulty
          <select name="difficulty" defaultValue={t?.difficulty || "Easy"}>
            {["Easy", "Moderate", "Challenging"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={t?.status || "DRAFT"}>
            {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="check-label">
        <input type="checkbox" name="featured" defaultChecked={t?.featured} />{" "}
        Feature on the homepage
      </label>
    </ActionForm>
  );
}
function TourDetailsEditor({
  tour,
  onDone,
}: {
  tour: Tour;
  onDone: () => Promise<void>;
}) {
  const [days, setDays] = useState<ItineraryDay[]>(
    tour.itinerary.length
      ? tour.itinerary
      : [
          {
            day: 1,
            title: "Arrival",
            description: "",
            meals: "Breakfast included",
          },
        ],
  );
  const [hotels, setHotels] = useState(
    tour.hotels.map((h) => ({
      name: h.name,
      address: h.address,
      stars: h.stars,
    })),
  );
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api.put(
            `/admin/tours/${tour.id}/itinerary`,
            days.map((d, i) => ({ ...d, day: i + 1 })),
          );
          await api.put(`/admin/tours/${tour.id}/hotels`, hotels);
          toast("Itinerary and stays saved.");
          await onDone();
        } catch (error) {
          toast(errorMessage(error), true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Day by day</h3>
      {days.map((d, i) => (
        <fieldset className="traveler-fields" key={i}>
          <legend>Day {i + 1}</legend>
          <label className="field">
            Title
            <input
              value={d.title}
              required
              minLength={3}
              onChange={(e) =>
                setDays(
                  days.map((v, j) =>
                    j === i ? { ...v, title: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            Description
            <textarea
              value={d.description}
              required
              minLength={10}
              onChange={(e) =>
                setDays(
                  days.map((v, j) =>
                    j === i ? { ...v, description: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            Meals
            <input
              value={d.meals}
              onChange={(e) =>
                setDays(
                  days.map((v, j) =>
                    j === i ? { ...v, meals: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-link danger"
            disabled={days.length === 1}
            onClick={() => setDays(days.filter((_, j) => j !== i))}
          >
            Remove day
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() =>
          setDays([
            ...days,
            {
              day: days.length + 1,
              title: "",
              description: "",
              meals: "Breakfast included",
            },
          ])
        }
      >
        Add a day
      </button>
      <h3>Places to stay</h3>
      {hotels.map((h, i) => (
        <fieldset key={i} className="traveler-fields">
          <label className="field">
            Hotel name
            <input
              required
              value={h.name}
              onChange={(e) =>
                setHotels(
                  hotels.map((v, j) =>
                    j === i ? { ...v, name: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            Address
            <input
              required
              value={h.address}
              onChange={(e) =>
                setHotels(
                  hotels.map((v, j) =>
                    j === i ? { ...v, address: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            Stars
            <input
              type="number"
              min={1}
              max={5}
              value={h.stars}
              onChange={(e) =>
                setHotels(
                  hotels.map((v, j) =>
                    j === i ? { ...v, stars: Number(e.target.value) } : v,
                  ),
                )
              }
            />
          </label>
          <button
            className="text-link danger"
            type="button"
            onClick={() => setHotels(hotels.filter((_, j) => j !== i))}
          >
            Remove stay
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() =>
          setHotels([...hotels, { name: "", address: "", stars: 4 }])
        }
      >
        Add a stay
      </button>
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save the details"}
      </button>
    </form>
  );
}
export function AdminCatalog({
  kind,
}: {
  kind: "destinations" | "categories";
}) {
  const q = useQuery({
    queryKey: ["admin", kind],
    queryFn: () => get<(Destination & Category)[]>(`/admin/${kind}`),
  });
  const [edit, setEdit] = useState<
    (Destination & Category) | null | undefined
  >();
  const [remove, setRemove] = useState<string | null>(null);
  const toast = useToast();
  return (
    <>
      <PageTitle
        title={
          kind === "destinations"
            ? "Places with a pull."
            : "A style for every traveler."
        }
        action={
          <button className="btn" onClick={() => setEdit(null)}>
            <Plus size={17} /> Add{" "}
            {kind === "destinations" ? "destination" : "category"}
          </button>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={["Name", "Description", "Actions"]}
          rows={
            q.data?.map((d) => [
              d.name,
              d.description,
              <div className="table-actions">
                <button className="text-link" onClick={() => setEdit(d)}>
                  Edit
                </button>
                <button
                  className="text-link danger"
                  onClick={() => setRemove(d.id)}
                >
                  Delete
                </button>
              </div>,
            ]) || []
          }
        />
      )}{" "}
      {edit !== undefined && (
        <Modal
          title={`${edit ? "Edit" : "Add"} ${kind === "destinations" ? "destination" : "category"}`}
          onClose={() => setEdit(undefined)}
        >
          <ActionForm
            onSubmit={async (f) => {
              const data = Object.fromEntries(f.entries());
              await (edit
                ? api.put(`/admin/${kind}/${edit.id}`, data)
                : api.post(`/admin/${kind}`, data));
              await q.refetch();
              setEdit(undefined);
              toast("Saved.");
            }}
          >
            <Field name="name" label="Name" value={edit?.name} />
            {kind === "destinations" && (
              <>
                <Field name="country" label="Country" value={edit?.country} />
                <Field
                  name="image"
                  label="Image URL"
                  type="url"
                  value={edit?.image}
                />
              </>
            )}
            <label className="field">
              Description
              <textarea
                name="description"
                defaultValue={edit?.description}
                required
                minLength={10}
              />
            </label>
          </ActionForm>
        </Modal>
      )}
      {remove && (
        <Modal title="Delete this record?" onClose={() => setRemove(null)}>
          <p>Records used by existing tours cannot be deleted.</p>
          <button
            className="btn danger"
            onClick={async () => {
              try {
                await api.delete(`/admin/${kind}/${remove}`);
                setRemove(null);
                await q.refetch();
                toast("Deleted.");
              } catch (error) {
                toast(errorMessage(error), true);
              }
            }}
          >
            Confirm deletion
          </button>
        </Modal>
      )}
    </>
  );
}
export function AdminAvailability() {
  const q = useQuery({
    queryKey: ["admin", "availability"],
    queryFn: () => get<Availability[]>("/admin/availability"),
  });
  const tours = useQuery({
    queryKey: ["admin", "tours"],
    queryFn: () => get<Tour[]>("/admin/tours"),
  });
  const [edit, setEdit] = useState<Availability | null | undefined>();
  const toast = useToast();
  return (
    <>
      <PageTitle
        title="Room for the next adventure."
        action={
          <button className="btn" onClick={() => setEdit(null)}>
            <Plus size={17} /> Add departure
          </button>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={["Journey", "Departure", "Reserved", "Capacity", "Actions"]}
          rows={
            q.data?.map((a) => [
              a.tour?.title,
              date(a.date),
              a.reserved,
              a.capacity,
              <button className="text-link" onClick={() => setEdit(a)}>
                Edit capacity
              </button>,
            ]) || []
          }
        />
      )}{" "}
      {edit !== undefined && (
        <Modal
          title={edit ? "Adjust departure capacity" : "Create a departure"}
          onClose={() => setEdit(undefined)}
        >
          <ActionForm
            onSubmit={async (f) => {
              if (edit)
                await api.patch(`/admin/availability/${edit.id}`, {
                  capacity: Number(f.get("capacity")),
                });
              else
                await api.post("/admin/availability", {
                  tourId: f.get("tourId"),
                  date: f.get("date"),
                  capacity: Number(f.get("capacity")),
                });
              setEdit(undefined);
              await q.refetch();
              toast("Departure saved.");
            }}
          >
            {!edit && (
              <>
                <label className="field">
                  Journey
                  <select name="tourId">
                    {tours.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Field name="date" label="Departure date" type="date" />
              </>
            )}
            <Field
              name="capacity"
              label="Total capacity"
              type="number"
              min={edit?.reserved || 1}
              max={500}
              value={edit?.capacity || 12}
            />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
export function AdminBookings() {
  const q = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => get<Booking[]>("/admin/bookings"),
  });
  const [selected, setSelected] = useState<Booking | null>(null);
  const toast = useToast();
  async function change(status: string) {
    try {
      await api.patch(`/admin/bookings/${selected!.id}`, { status });
      setSelected(null);
      await q.refetch();
      toast("Booking updated.");
    } catch (error) {
      toast(errorMessage(error), true);
    }
  }
  return (
    <>
      <PageTitle title="Every booking, a new beginning." />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={[
            "Reference",
            "Traveler",
            "Journey",
            "Departure",
            "Status",
            "Payment",
            "Total",
            "Actions",
          ]}
          rows={
            q.data?.map((b) => [
              b.reference,
              b.user?.name,
              b.tour.title,
              date(b.travelDate),
              <Badge>{b.status}</Badge>,
              <Badge>{b.paymentStatus}</Badge>,
              money(b.total),
              <button className="text-link" onClick={() => setSelected(b)}>
                Manage
              </button>,
            ]) || []
          }
        />
      )}{" "}
      {selected && (
        <Modal title={selected.reference} onClose={() => setSelected(null)}>
          <h3>{selected.tour.title}</h3>
          <p>
            {selected.user?.name} · {selected.user?.email}
          </p>
          <p>
            {date(selected.travelDate)} · {selected.count} traveler(s) ·{" "}
            {money(selected.total)}
          </p>
          {selected.travelers.map((t, i) => (
            <p key={i}>
              {t.name} · {t.age} years
            </p>
          ))}
          <p>{selected.tour.cancellationPolicy}</p>
          <div className="button-row">
            {["PENDING", "CONFIRMED"].includes(selected.status) && (
              <button
                className="btn btn-outline danger"
                onClick={() => change("CANCELLED")}
              >
                Cancel & mock refund
              </button>
            )}
            {selected.status === "CONFIRMED" && (
              <button className="btn" onClick={() => change("COMPLETED")}>
                Mark completed
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
export function AdminReviews() {
  const q = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => get<Review[]>("/admin/reviews"),
  });
  const toast = useToast();
  return (
    <>
      <PageTitle title="Their stories, in their words." />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={["Traveler", "Tour", "Rating", "Review", "Visibility"]}
          rows={
            q.data?.map((r) => [
              r.user?.name,
              r.tour?.title,
              `${r.rating} / 5`,
              <>
                <strong>{r.title}</strong>
                <p>{r.comment}</p>
              </>,
              <button
                className="text-link"
                onClick={async () => {
                  try {
                    await api.patch(`/admin/reviews/${r.id}`, {
                      visible: !r.visible,
                    });
                    await q.refetch();
                  } catch (error) {
                    toast(errorMessage(error), true);
                  }
                }}
              >
                {r.visible ? "Published · hide" : "Hidden · publish"}
              </button>,
            ]) || []
          }
        />
      )}
    </>
  );
}
export function AdminKnowledge() {
  const q = useQuery({
    queryKey: ["admin", "rag"],
    queryFn: () => get<Document[]>("/admin/rag/documents"),
  });
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => get<User[]>("/admin/users"),
  });
  const [edit, setEdit] = useState<Document | null | undefined>();
  const [remove, setRemove] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const toast = useToast();
  async function reindex(documentId?: string) {
    setIndexing(true);
    try {
      const response = await api.post<{
        results: { id: string; error?: string; chunks?: number }[];
      }>("/admin/rag/reindex", { documentId });
      const failed = response.data.results.filter((r) => r.error);
      toast(
        failed.length
          ? `${failed.length} document(s) could not be indexed. ${failed[0].error}`
          : "Travel knowledge indexed successfully.",
        !!failed.length,
      );
      await q.refetch();
    } catch (e) {
      toast(errorMessage(e), true);
    } finally {
      setIndexing(false);
    }
  }
  return (
    <>
      <PageTitle
        title="A little knowledge goes a long way."
        subtitle="Sources for the travel assistant. Private sources are visible only to their owner."
        action={
          <button className="btn" onClick={() => setEdit(null)}>
            <Plus size={17} /> Add knowledge
          </button>
        }
      />
      <div className="notice">
        Semantic indexing uses your configured local Ollama embedding model.
        Source excerpts remain available when the model is offline.
      </div>
      <button
        className="btn btn-outline"
        disabled={indexing}
        onClick={() => reindex()}
      >
        <RefreshCw size={16} />
        {indexing ? "Indexing…" : "Re-index all sources"}
      </button>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={["Source", "Access", "Status", "Chunks", "Actions"]}
          rows={
            q.data?.map((d) => [
              d.title,
              d.ownerId
                ? users.data?.find((u) => u.id === d.ownerId)?.email ||
                  "Private"
                : "Public",
              <Badge>{d.status}</Badge>,
              d._count.chunks,
              <div className="table-actions">
                <button className="text-link" onClick={() => setEdit(d)}>
                  Edit
                </button>
                <button
                  className="text-link"
                  disabled={indexing}
                  onClick={() => reindex(d.id)}
                >
                  Index
                </button>
                <button
                  className="text-link danger"
                  onClick={() => setRemove(d.id)}
                >
                  Delete
                </button>
              </div>,
            ]) || []
          }
        />
      )}{" "}
      {edit !== undefined && (
        <Modal
          title={edit ? "Edit knowledge" : "Add travel knowledge"}
          onClose={() => setEdit(undefined)}
        >
          <ActionForm
            onSubmit={async (f) => {
              const data = {
                title: f.get("title"),
                content: f.get("content"),
                type: f.get("type"),
                ownerId: f.get("ownerId") || null,
              };
              await (edit
                ? api.put(`/admin/rag/documents/${edit.id}`, data)
                : api.post("/admin/rag/documents", data));
              setEdit(undefined);
              await q.refetch();
              toast("Source saved. Index it to enable semantic retrieval.");
            }}
          >
            <Field name="title" label="Source title" value={edit?.title} />
            <label className="field">
              Knowledge type
              <select name="type" defaultValue={edit?.type || "GENERAL_TRAVEL"}>
                {[
                  "GENERAL_TRAVEL",
                  "TOUR_INFORMATION",
                  "DESTINATION_INFORMATION",
                  "FAQ",
                  "CANCELLATION",
                  "POLICY",
                  "PRIVATE_BOOKING",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Who can access this source?
              <select name="ownerId" defaultValue={edit?.ownerId || ""}>
                <option value="">Public — all signed-in travelers</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    Private — {u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Source content
              <textarea
                className="large-textarea"
                name="content"
                required
                minLength={20}
                defaultValue={edit?.content}
              />
            </label>
          </ActionForm>
        </Modal>
      )}
      {remove && (
        <Modal
          title="Delete this knowledge source?"
          onClose={() => setRemove(null)}
        >
          <p>
            Its indexed chunks will also be removed from assistant retrieval.
          </p>
          <button
            className="btn danger"
            onClick={async () => {
              try {
                await api.delete(`/admin/rag/documents/${remove}`);
                setRemove(null);
                await q.refetch();
                toast("Source deleted.");
              } catch (error) {
                toast(errorMessage(error), true);
              }
            }}
          >
            Confirm deletion
          </button>
        </Modal>
      )}
    </>
  );
}
export function AdminNotifications() {
  const q = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => get<Notice[]>("/admin/notifications"),
  });
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => get<User[]>("/admin/users"),
  });
  const [create, setCreate] = useState(false);
  const toast = useToast();
  return (
    <>
      <PageTitle
        title="Keep your travelers in the loop."
        action={
          <button className="btn" onClick={() => setCreate(true)}>
            <Plus size={17} /> Send notification
          </button>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={["Traveler", "Title", "Message", "Status", "Date"]}
          rows={
            q.data?.map((n) => [
              n.user?.email,
              n.title,
              n.message,
              n.read ? "Read" : "Unread",
              date(n.createdAt),
            ]) || []
          }
        />
      )}{" "}
      {create && (
        <Modal title="A note for a traveler" onClose={() => setCreate(false)}>
          <ActionForm
            button="Send notification"
            onSubmit={async (f) => {
              await api.post(
                "/admin/notifications",
                Object.fromEntries(f.entries()),
              );
              setCreate(false);
              await q.refetch();
              toast("Notification delivered.");
            }}
          >
            <label className="field">
              Traveler
              <select name="userId">
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </select>
            </label>
            <Field name="title" label="Title" />
            <label className="field">
              Message
              <textarea name="message" required minLength={3} />
            </label>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
export function AdminLogs({ contacts = false }: { contacts?: boolean }) {
  const q = useQuery({
    queryKey: ["admin", contacts ? "contacts" : "audit-logs"],
    queryFn: () =>
      get<
        {
          id: string;
          name: string;
          email: string;
          message: string;
          action: string;
          entity: string;
          entityId: string;
          createdAt: string;
          user?: { name: string };
        }[]
      >(`/admin/${contacts ? "contacts" : "audit-logs"}`),
  });
  return (
    <>
      <PageTitle
        title={
          contacts
            ? "A conversation starts here."
            : "The details behind the details."
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          headers={
            contacts
              ? ["Name", "Email", "Message", "Received"]
              : ["Administrator", "Action", "Entity", "Record", "When"]
          }
          rows={
            q.data?.map((r) =>
              contacts
                ? [r.name, r.email, r.message, date(r.createdAt)]
                : [
                    r.user?.name || "System",
                    r.action,
                    r.entity,
                    r.entityId || "—",
                    new Date(r.createdAt).toLocaleString(),
                  ],
            ) || []
          }
        />
      )}
    </>
  );
}
