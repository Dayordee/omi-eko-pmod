// Authentication for Omi-Eko PMOD, using Supabase Auth over its REST API.
// No extra dependency: this talks to <project>/auth/v1 with fetch().
//
// Config (see .env.example):
//   VITE_SUPABASE_URL       e.g. https://abcdxyz.supabase.co
//   VITE_SUPABASE_ANON_KEY  the anon / publishable key (safe in the browser)

import "./auth.css";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_KEY = "omieko-session";
const THEME_KEY = "omieko-theme";

export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

// ---------- session storage ----------

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: the session lasts for this page visit only.
  }
}

function normaliseSession(data) {
  if (!data || !data.access_token) return null;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at:
      data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user || null,
  };
}

// ---------- API ----------

class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function api(path, { method = "POST", body, token, query = "" } = {}) {
  let response;

  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1${path}${query}`, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AuthError(
      "Cannot reach the sign-in service. Check your internet connection.",
      "network",
    );
  }

  let data = null;
  const text = await response.text();

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const code = data?.error_code || data?.error || String(response.status);
    const message =
      data?.msg || data?.message || data?.error_description || "Request failed.";
    throw new AuthError(message, code);
  }

  return data;
}

const redirectUrl = () => `?redirect_to=${encodeURIComponent(window.location.origin + "/")}`;

function friendlyMessage(error) {
  switch (error.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Your email is not verified yet. Open the verification link we sent you.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try signing in.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "429":
      return "Too many attempts. Please wait a minute and try again.";
    case "signup_disabled":
      return "Registration is currently disabled for this project.";
    default:
      return error.message;
  }
}

// ---------- session handling ----------

async function refreshSession(session) {
  const data = await api("/token", {
    query: "?grant_type=refresh_token",
    body: { refresh_token: session.refresh_token },
  });

  const next = normaliseSession(data);
  if (!next) throw new AuthError("Session expired.", "session_expired");
  writeSession(next);
  return next;
}

// Returns a valid session, or null when the user must sign in.
async function getValidSession() {
  const session = readSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at - now > 60) return session;

  try {
    return await refreshSession(session);
  } catch (error) {
    // A network failure should not log people out; a rejected token should.
    if (error.code === "network") return session.expires_at > now ? session : null;
    writeSession(null);
    return null;
  }
}

// Reads a #access_token=... link (email verification / password recovery).
function readAuthHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const clean = () =>
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

  if (params.get("error")) {
    clean();
    return {
      error:
        params.get("error_description")?.replace(/\+/g, " ") ||
        "That link is invalid or has expired.",
    };
  }

  if (!params.get("access_token")) return null;

  clean();

  return {
    type: params.get("type"),
    session: normaliseSession({
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      expires_in: Number(params.get("expires_in")) || 3600,
    }),
  };
}

export function getCurrentUser() {
  return readSession()?.user || null;
}

export async function signOut() {
  const session = readSession();
  writeSession(null);

  if (session?.access_token) {
    try {
      await api("/logout", { token: session.access_token });
    } catch {
      // Local sign-out is already done.
    }
  }

  window.location.reload();
}

// ---------- UI ----------

const ICON_EYE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

function passwordField(id, label, autocomplete) {
  return `
    <label class="auth-field" for="${id}">
      <span>${label}</span>
      <div class="auth-input-wrap">
        <input id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" minlength="8" required />
        <button type="button" class="auth-eye" data-reveal="${id}" aria-label="Show password" tabindex="-1">${ICON_EYE}</button>
      </div>
    </label>`;
}

const VIEWS = {
  signin: {
    title: "Sign in",
    lead: "Access the ferry planning and suitability dashboard.",
    html: `
      <form class="auth-form" data-form="signin" novalidate>
        <label class="auth-field" for="email"><span>Email</span>
          <input id="email" name="email" type="email" autocomplete="email" required />
        </label>
        ${passwordField("password", "Password", "current-password")}
        <div class="auth-row"><button type="button" class="auth-link" data-view="forgot">Forgot password?</button></div>
        <div class="auth-message" role="alert" hidden></div>
        <button type="submit" class="auth-submit">Sign in</button>
      </form>
      <p class="auth-switch">New to Omi-Eko PMOD? <button type="button" class="auth-link" data-view="register">Create an account</button></p>`,
  },

  register: {
    title: "Create your account",
    lead: "Register to use the Omi-Eko PMOD dashboard. We will email you a link to verify your address.",
    html: `
      <form class="auth-form" data-form="register" novalidate>
        <div class="auth-grid">
          <label class="auth-field" for="full_name"><span>Full name</span>
            <input id="full_name" name="full_name" type="text" autocomplete="name" required />
          </label>
          <label class="auth-field" for="organisation"><span>Organisation <em>(optional)</em></span>
            <input id="organisation" name="organisation" type="text" autocomplete="organization" />
          </label>
        </div>
        <label class="auth-field" for="email"><span>Email</span>
          <input id="email" name="email" type="email" autocomplete="email" required />
        </label>
        ${passwordField("password", "Password", "new-password")}
        <div class="auth-strength" aria-hidden="true"><i></i><i></i><i></i><i></i><b>At least 8 characters</b></div>
        ${passwordField("confirm", "Confirm password", "new-password")}
        <div class="auth-message" role="alert" hidden></div>
        <button type="submit" class="auth-submit">Create account</button>
      </form>
      <p class="auth-switch">Already registered? <button type="button" class="auth-link" data-view="signin">Sign in</button></p>`,
  },

  forgot: {
    title: "Reset your password",
    lead: "Enter your email and we will send you a link to choose a new password.",
    html: `
      <form class="auth-form" data-form="forgot" novalidate>
        <label class="auth-field" for="email"><span>Email</span>
          <input id="email" name="email" type="email" autocomplete="email" required />
        </label>
        <div class="auth-message" role="alert" hidden></div>
        <button type="submit" class="auth-submit">Send reset link</button>
      </form>
      <p class="auth-switch"><button type="button" class="auth-link" data-view="signin">Back to sign in</button></p>`,
  },

  reset: {
    title: "Choose a new password",
    lead: "Set a new password for your account.",
    html: `
      <form class="auth-form" data-form="reset" novalidate>
        ${passwordField("password", "New password", "new-password")}
        <div class="auth-strength" aria-hidden="true"><i></i><i></i><i></i><i></i><b>At least 8 characters</b></div>
        ${passwordField("confirm", "Confirm new password", "new-password")}
        <div class="auth-message" role="alert" hidden></div>
        <button type="submit" class="auth-submit">Update password</button>
      </form>`,
  },
};

function strengthScore(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score++;
  return score;
}

const STRENGTH_LABELS = ["At least 8 characters", "Weak", "Fair", "Good", "Strong"];

function setMessage(form, text, kind = "error") {
  const box = form.querySelector(".auth-message");
  if (!box) return;
  box.textContent = text || "";
  box.dataset.kind = kind;
  box.hidden = !text;
}

function setBusy(form, busy) {
  const button = form.querySelector(".auth-submit");
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Runs the sign-in gate. Resolves with the signed-in session once the user is
 * authenticated; resolves with null straight away if Supabase is not configured.
 */
export function requireAuth(mount) {
  if (!authConfigured) {
    console.warn(
      "Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). " +
        "Sign-in is disabled and the dashboard is open.",
    );
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let theme = "light";

    try {
      const saved = localStorage.getItem(THEME_KEY);
      theme =
        saved === "dark" || saved === "light"
          ? saved
          : window.matchMedia?.("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    } catch {
      theme = "light";
    }

    document.documentElement.dataset.theme = theme;

    mount.innerHTML = `
      <div class="auth-screen">
        <aside class="auth-brand">
          <div class="auth-brand-top">
            <div class="auth-mark">O</div>
            <div><strong>OMI-EKO <span>PMOD</span></strong><small>Passenger Mobility &amp; Multimodal Transport</small></div>
          </div>
          <div class="auth-brand-copy">
            <h2>Ferry transport planning and spatial suitability analysis for Lagos.</h2>
            <ul>
              <li>Ferry terminals and routes on a single interactive map</li>
              <li>Terminal and route suitability indices</li>
              <li>Road, rail and BRT network context</li>
            </ul>
          </div>
          <div class="auth-brand-foot">Lagos, Nigeria</div>
        </aside>

        <main class="auth-panel">
          <div class="auth-card">
            <div class="auth-notice" hidden></div>
            <h1 class="auth-title"></h1>
            <p class="auth-lead"></p>
            <div class="auth-body"></div>
          </div>
        </main>
      </div>`;

    const screen = mount.querySelector(".auth-screen");
    const card = mount.querySelector(".auth-card");
    const notice = card.querySelector(".auth-notice");
    const title = card.querySelector(".auth-title");
    const lead = card.querySelector(".auth-lead");
    const body = card.querySelector(".auth-body");

    let pendingSession = null; // password-recovery session, not saved until reset completes
    let lastEmail = "";

    function showNotice(text, kind = "info") {
      notice.textContent = text || "";
      notice.dataset.kind = kind;
      notice.hidden = !text;
    }

    function finish(session) {
      writeSession(session);
      resolve(session);
    }

    function showView(name, prefillEmail) {
      const view = VIEWS[name];
      title.textContent = view.title;
      lead.textContent = view.lead;
      body.innerHTML = view.html;
      card.classList.remove("is-in");
      void card.offsetWidth; // restart the entrance animation
      card.classList.add("is-in");

      const emailInput = body.querySelector("#email");
      if (emailInput && (prefillEmail || lastEmail)) emailInput.value = prefillEmail || lastEmail;

      const first = body.querySelector("input");
      if (first) first.focus({ preventScroll: true });
    }

    function showCheckEmail(email, heading, text) {
      title.textContent = heading;
      lead.textContent = "";
      card.classList.remove("is-in");
      void card.offsetWidth;
      card.classList.add("is-in");

      body.innerHTML = `
        <div class="auth-sent">
          <div class="auth-sent-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div>
          <p></p>
          <p class="auth-hint">Can't find it? Check your spam folder.</p>
        </div>
        <p class="auth-switch"><button type="button" class="auth-link" data-view="signin">Back to sign in</button></p>`;

      body.querySelector(".auth-sent p").textContent = text.replace("{email}", email);
    }

    // --- events (delegated, attached once) ---

    screen.addEventListener("click", (event) => {
      const viewBtn = event.target.closest("[data-view]");
      if (viewBtn) {
        showNotice("");
        showView(viewBtn.dataset.view);
        return;
      }

      const reveal = event.target.closest("[data-reveal]");
      if (reveal) {
        const input = body.querySelector(`#${reveal.dataset.reveal}`);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        reveal.setAttribute("aria-label", show ? "Hide password" : "Show password");
        reveal.classList.toggle("is-on", show);
      }
    });

    screen.addEventListener("input", (event) => {
      if (event.target.id !== "password") return;
      const meter = body.querySelector(".auth-strength");
      if (!meter) return;

      const score = event.target.value ? strengthScore(event.target.value) : 0;
      meter.dataset.score = String(score);
      meter.querySelector("b").textContent = STRENGTH_LABELS[score];
    });

    screen.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.target.closest("form");
      if (!form) return;

      const data = Object.fromEntries(new FormData(form).entries());
      const email = String(data.email || "").trim();
      const password = String(data.password || "");
      const kind = form.dataset.form;

      setMessage(form, "");

      // Client-side checks (the server remains the real authority).
      if (kind !== "reset" && !validEmail(email)) {
        return setMessage(form, "Enter a valid email address.");
      }

      if (kind === "register" && !String(data.full_name || "").trim()) {
        return setMessage(form, "Enter your full name.");
      }

      if ((kind === "register" || kind === "reset") && password.length < 8) {
        return setMessage(form, "Use a password of at least 8 characters.");
      }

      if ((kind === "register" || kind === "reset") && password !== data.confirm) {
        return setMessage(form, "The two passwords do not match.");
      }

      if (kind === "signin" && !password) {
        return setMessage(form, "Enter your password.");
      }

      setBusy(form, true);

      try {
        if (kind === "signin") {
          const result = await api("/token", {
            query: "?grant_type=password",
            body: { email, password },
          });
          return finish(normaliseSession(result));
        }

        if (kind === "register") {
          lastEmail = email;

          const result = await api("/signup", {
            query: redirectUrl(),
            body: {
              email,
              password,
              data: {
                full_name: String(data.full_name).trim(),
                organisation: String(data.organisation || "").trim(),
              },
            },
          });

          // Email confirmation off in Supabase: we get a session straight away.
          const session = normaliseSession(result);
          if (session) return finish(session);

          return showCheckEmail(
            email,
            "Check your email",
            "We sent a verification link to {email}. Open it to activate your account, then sign in.",
          );
        }

        if (kind === "forgot") {
          lastEmail = email;
          await api("/recover", { query: redirectUrl(), body: { email } });

          // Same message whether or not the address exists.
          return showCheckEmail(
            email,
            "Check your email",
            "If an account exists for {email}, a password reset link is on its way.",
          );
        }

        if (kind === "reset") {
          const result = await api("/user", {
            method: "PUT",
            token: pendingSession.access_token,
            body: { password },
          });

          return finish({ ...pendingSession, user: result || pendingSession.user });
        }
      } catch (error) {
        setMessage(form, friendlyMessage(error));

        if (error.code === "email_not_confirmed" && kind === "signin") {
          lastEmail = email;
        }
      } finally {
        if (form.isConnected) setBusy(form, false);
      }
    });

    // --- start: stored session, auth link in the URL, or the sign-in form ---

    (async () => {
      const link = readAuthHash();

      if (link?.session) {
        if (link.type === "recovery") {
          pendingSession = link.session;
          showView("reset");
          return;
        }

        // Email verification (or magic) link: the user is now signed in.
        try {
          const user = await api("/user", { method: "GET", token: link.session.access_token });
          return finish({ ...link.session, user });
        } catch {
          // Fall through to the sign-in form.
        }
      }

      const existing = await getValidSession();
      if (existing) return resolve(existing);

      showView("signin");
      if (link?.error) showNotice(link.error, "error");
    })();
  });
}
