import { Link } from "react-router-dom";
import { Compass, Users, Leaf, ArrowUpRight, Mail, MapPin } from "lucide-react";
import { ActionForm, Field, useToast } from "../components/ui";
import { api } from "../lib/api";
export function About() {
  return (
    <div className="container page">
      <div className="page-heading centered">
        <span className="eyebrow">A LITTLE ABOUT ROAMLY</span>
        <h1>For the endlessly curious.</h1>
        <p>We’re here for the moments that make your world a little bigger.</p>
      </div>
      <img
        className="about-cover"
        src="https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1800&q=85"
        alt="Quiet woodland and wildlife in nature"
      />
      <div className="story-copy narrow">
        <h2>
          We believe in going places.
          <br />
          And feeling something when you do.
        </h2>
        <p>
          Not every journey needs a checklist. Sometimes it needs a good local
          guide, a small group of curious people, and enough room for a happy
          detour.
        </p>
        <p>
          Roamly brings together thoughtful itineraries, welcoming stays and
          experiences rooted in the places we visit. From a mountain sunrise to
          a long lunch with new friends, we make space for what matters.
        </p>
      </div>
      <div className="values-grid">
        {[
          [
            Compass,
            "Curiosity comes first",
            "Follow the little things that make you stop, wonder and look again.",
          ],
          [
            Users,
            "Small groups. Big connections.",
            "Travel alongside a few kindred spirits, with local hosts who care.",
          ],
          [
            Leaf,
            "A lighter footprint",
            "Thoughtful choices and local experiences that keep more value in the communities we visit.",
          ],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof Compass;
          return (
            <div className="panel" key={String(title)}>
              <I />
              <h3>{String(title)}</h3>
              <p>{String(body)}</p>
            </div>
          );
        })}
      </div>
      <div className="centered section">
        <h2>Your next story is waiting.</h2>
        <Link className="btn" to="/tours">
          Find a little elsewhere <ArrowUpRight size={18} />
        </Link>
      </div>
    </div>
  );
}
export function Contact() {
  const toast = useToast();
  return (
    <div className="container page">
      <div className="page-heading">
        <span className="eyebrow">GOOD CONVERSATIONS LEAD TO GREAT PLACES</span>
        <h1>Let’s talk about your next chapter.</h1>
        <p>A question, a daydream, a little help choosing? We’re here.</p>
      </div>
      <div className="contact-grid">
        <div className="contact-copy">
          <h2>Tell us what’s on your horizon.</h2>
          <p>
            Our team can help you find the right journey, understand an
            itinerary, or plan around the little details that matter to you.
          </p>
          <div className="contact-card">
            <Mail />
            <div>
              <h4>Drop us a note</h4>
              <p>Use the form and your message will reach our travel team.</p>
            </div>
          </div>
          <div className="contact-card">
            <Compass />
            <div>
              <h4>Already have a booking?</h4>
              <p>
                Your travel assistant can find dates, stays and itinerary
                details.
              </p>
              <Link className="text-link" to="/assistant">
                Ask your travel sidekick <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
        <div className="panel">
          <ActionForm
            button="Send a little hello"
            onSubmit={async (f) => {
              await api.post("/contact", Object.fromEntries(f.entries()));
              toast("Your message is with our team. Thanks for saying hello.");
            }}
          >
            <Field
              name="name"
              label="Your name"
              placeholder="What should we call you?"
            />
            <Field
              name="email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
            />
            <label className="field">
              What’s on your mind?
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={3000}
                placeholder="Tell us a little about the adventure you’re imagining…"
              />
            </label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
