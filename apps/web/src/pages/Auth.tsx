import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Compass } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/ui";
const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(72),
});
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const [error, setError] = useState("");
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signup = mode === "register";
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=85"
          alt="A peaceful lakeside escape"
        />
        <div>
          <Compass size={38} />
          <h2>
            A world of stories.
            <br />
            Yours starts here.
          </h2>
          <p>
            Find your people. Find your place.
            <br />
            Find a little more of yourself.
          </p>
        </div>
      </div>
      <div className="auth-form">
        <span className="eyebrow">
          {signup
            ? "THE FIRST STEP IS THE BEST ONE"
            : "YOUR NEXT CHAPTER AWAITS"}
        </span>
        <h1>{signup ? "Hello, fellow wanderer." : "Good to have you back."}</h1>
        <p>
          {signup
            ? "Create an account and let your curiosity lead the way."
            : "Sign in and pick up where your daydreams left off."}
        </p>
        <form
          className="form-grid"
          onSubmit={handleSubmit(async (data) => {
            setError("");
            try {
              await api.post(`/auth/${mode}`, data);
              const result = (await auth.refresh()) as {
                data?: { role: string };
              };
              navigate(
                location.state?.from ||
                  (result.data?.role === "ADMIN" ? "/admin" : "/dashboard"),
              );
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          {signup && (
            <label className="field">
              Your name
              <input
                {...register("name")}
                required
                minLength={2}
                placeholder="First and last name"
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            Email address
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <span className="field-error">{errors.email.message}</span>
            )}
          </label>
          <label className="field">
            Password
            <input
              {...register("password")}
              type="password"
              placeholder="At least 10 characters"
              autoComplete={signup ? "new-password" : "current-password"}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </label>
          {!signup && (
            <Link className="text-link auth-forgot" to="/forgot-password">
              Forgot your password?
            </Link>
          )}
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          <button className="btn full-width" disabled={isSubmitting}>
            {isSubmitting
              ? "Just a moment…"
              : signup
                ? "Start my next chapter"
                : "Let’s go"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {signup ? "Already part of the journey?" : "New around here?"}{" "}
          <Link to={signup ? "/login" : "/register"}>
            {signup ? "Sign in" : "Join the adventure"}
          </Link>
        </p>
        <div className="auth-note">
          A little curiosity is all you need.
          <br />
          Your information is always kept private.
        </div>
      </div>
    </div>
  );
}
export function PasswordPage({ reset = false }: { reset?: boolean }) {
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <div className="container narrow page">
      <span className="eyebrow">LET’S GET YOU BACK ON TRACK</span>
      <h1>{reset ? "A fresh start." : "Lost your way in?"}</h1>
      <p>
        {reset
          ? "Choose a new password for your account."
          : "Enter your email and we’ll send a reset link."}
      </p>
      {done ? (
        <div className="panel">
          <h3>{reset ? "Password updated." : "Check your inbox."}</h3>
          <p>
            {reset
              ? "You can now sign in with your new password."
              : "If an account exists, a reset email has been sent. In local development, email is delivered to the local mail inbox."}
          </p>
          <Link className="btn" to="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const data = new FormData(e.currentTarget);
            try {
              await api.post(
                `/auth/${reset ? "reset-password" : "forgot-password"}`,
                reset
                  ? {
                      token: params.get("token"),
                      password: data.get("password"),
                    }
                  : { email: data.get("email") },
              );
              setDone(true);
            } catch (error) {
              toast(errorMessage(error), true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            {reset ? "New password" : "Email address"}
            <input
              name={reset ? "password" : "email"}
              type={reset ? "password" : "email"}
              required
              minLength={reset ? 10 : undefined}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy
              ? "Please wait…"
              : reset
                ? "Update password"
                : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}
