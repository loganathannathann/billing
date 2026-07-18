import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/aarika-logo.png";
import { tryLogin, getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const s = getSession();
    if (s) nav({ to: "/billing" });
  }, [nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const role = tryLogin(pass.trim());
      setLoading(false);
      if (!role) {
        toast.error("Invalid passcode");
        setPass("");
        return;
      }
      toast.success(`Welcome, ${role === "owner" ? "Owner" : "Staff"}`);
      nav({ to: role === "owner" ? "/dashboard" : "/billing" });
    }, 350);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_at_top,theme(colors.accent/.6),transparent_60%),radial-gradient(ellipse_at_bottom,theme(colors.secondary),transparent_50%)]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-card shadow-2xl border border-border/50 p-8 md:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-2xl overflow-hidden bg-maroon-gradient ring-4 ring-gold/30 shadow-lg">
              <img src={logoUrl} alt="Aarika Looms" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-6 text-4xl font-serif text-primary">Aarika Looms</h1>
            <p className="mt-1 text-xs tracking-[0.3em] text-gold font-medium">POS TERMINAL</p>
          </div>

          <form onSubmit={submit} className="mt-10 space-y-5">
            <div>
              <label className="text-[11px] tracking-widest font-semibold text-muted-foreground">
                SECURITY PASSCODE
              </label>
              <div className="mt-2 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="pl-10 pr-10 h-12 text-lg tracking-[0.4em] text-center"
                  placeholder="••••"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle passcode visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || pass.length === 0}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-[0.2em] text-sm"
            >
              {loading ? "AUTHENTICATING…" : "AUTHENTICATE"}
            </Button>

            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                SYSTEM ONLINE · ENCRYPTED
              </div>
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-[10px] tracking-[0.3em] text-muted-foreground">
          AARIKA LOOMS MANAGEMENT TERMINAL V1.0
        </p>
        
      </div>
    </main>
  );
}
