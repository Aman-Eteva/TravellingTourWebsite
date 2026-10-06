import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FormEvent,
  useEffect,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  Compass,
  X,
  LoaderCircle,
} from "lucide-react";
import { errorMessage } from "../lib/api";
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message, error = false) => setToast({ message, error })}
    >
      {children}
      {toast && (
        <div className={`toast ${toast.error ? "error" : ""}`} role="status">
          {toast.error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Finding your next adventure…
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="empty">
      <AlertCircle />
      <h3>Let’s try that again</h3>
      <p>{errorMessage(error)}</p>
      {retry && (
        <button className="btn" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Compass size={36} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className={`badge ${String(children).toLowerCase()}`}>
      {children}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = original;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function ActionForm({
  children,
  onSubmit,
  button = "Save changes",
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<unknown>;
  button?: string;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      await onSubmit(new FormData(form));
    } catch (error) {
      toast(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid">
      {children}
      <button className="btn" disabled={busy}>
        {busy ? "Please wait…" : button}
      </button>
    </form>
  );
}
export function Field({
  label,
  name,
  type = "text",
  value,
  required = true,
  placeholder,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </label>
  );
}
