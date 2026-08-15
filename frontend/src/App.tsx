import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000";

type User = {
  name: string;
  email: string;
  picture?: string;
};

type Email = {
  id?: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status?: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState("dashboard");

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const name = params.get("name");
    const email = params.get("email");
    const picture = params.get("picture");

    if (name && email) {
      const loggedInUser = {
        name,
        email,
        picture: picture || undefined,
      };

      setUser(loggedInUser);

      localStorage.setItem(
        "queuora_user",
        JSON.stringify(loggedInUser)
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    } else {
      const savedUser = localStorage.getItem("queuora_user");

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("queuora_user");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadEmails();
    }
  }, [user]);

  const loadEmails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/emails`);

      if (Array.isArray(response.data)) {
        setEmails(response.data);
      } else if (Array.isArray(response.data.emails)) {
        setEmails(response.data.emails);
      }
    } catch (error) {
      console.log("Could not load emails yet.");
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem("queuora_user");
    setUser(null);
    setPage("dashboard");
  };

 const scheduleEmail = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!recipient || !subject || !body || !scheduledAt) {
    setMessage("Please fill all fields.");
    return;
  }

  const selectedDate = new Date(scheduledAt);

  if (Number.isNaN(selectedDate.getTime())) {
    setMessage("Please select a valid schedule time.");
    return;
  }

  if (selectedDate <= new Date()) {
    setMessage("Schedule time must be in the future.");
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    console.log("Scheduling email:", {
      recipient,
      subject,
      scheduledAt,
      isoScheduledAt: selectedDate.toISOString(),
    });

    const response = await axios.post(
      `${API_URL}/api/emails/schedule`,
      {
        recipient,
        subject,
        body,
        scheduledAt: selectedDate.toISOString(),
      }
    );

    console.log("Schedule API response:", response.data);

    setMessage(
      response.data?.message || "Email scheduled successfully!"
    );

    setRecipient("");
    setSubject("");
    setBody("");
    setScheduledAt("");

    await loadEmails();

    setPage("scheduled");
  } catch (error: any) {
    console.error("Schedule email error:", error);

    setMessage(
      error?.response?.data?.message ||
        "Unable to schedule email."
    );
  } finally {
    setLoading(false);
  }
};
  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="logo-circle">Q</div>

          <h1>Welcome to Queuora</h1>

          <p>
            Smart email scheduling, built for reliable outreach.
          </p>

          <button
            className="google-button"
            onClick={loginWithGoogle}
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <div className="secure-text">
            🔒 Secure authentication powered by Google
          </div>
        </div>
      </div>
    );
  }

  const scheduledEmails = emails.filter(
    (email) =>
      email.status === "scheduled" ||
      email.status === "pending" ||
      !email.status
  );

  const sentEmails = emails.filter(
    (email) =>
      email.status === "sent" ||
      email.status === "completed"
  );

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">Q</div>
          <span>Queuora</span>
        </div>

        <nav>
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={page === "campaigns" ? "active" : ""}
            onClick={() => setPage("campaigns")}
          >
            <span>◉</span>
            Campaigns
          </button>

          <button
            className={page === "create" ? "active" : ""}
            onClick={() => setPage("create")}
          >
            <span>＋</span>
            Create Email
          </button>

          <button
            className={page === "scheduled" ? "active" : ""}
            onClick={() => setPage("scheduled")}
          >
            <span>◷</span>
            Scheduled
          </button>

          <button
            className={page === "sent" ? "active" : ""}
            onClick={() => setPage("sent")}
          >
            <span>✓</span>
            Sent
          </button>

          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => setPage("settings")}
          >
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            {user.picture ? (
              <img src={user.picture} alt="profile" />
            ) : (
              <div className="avatar">
                {user.name.charAt(0)}
              </div>
            )}

            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>
              {page === "dashboard" && "Dashboard"}
              {page === "campaigns" && "Campaigns"}
              {page === "create" && "Create Email"}
              {page === "scheduled" && "Scheduled Emails"}
              {page === "sent" && "Sent Emails"}
              {page === "settings" && "Settings"}
            </h2>

            <p>
              Manage your email outreach from one place.
            </p>
          </div>

          <div className="profile">
            {user.picture && (
              <img src={user.picture} alt="profile" />
            )}
            <span>{user.name}</span>
          </div>
        </header>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <section>
            <div className="welcome-card">
              <div>
                <p className="eyebrow">WELCOME BACK</p>
                <h1>Hi, {user.name.split(" ")[0]} 👋</h1>
                <p>
                  Ready to schedule your next email campaign?
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setPage("create")}
              >
                + Create Email
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Total Emails</span>
                <strong>{emails.length}</strong>
              </div>

              <div className="stat-card">
                <span>Scheduled</span>
                <strong>{scheduledEmails.length}</strong>
              </div>

              <div className="stat-card">
                <span>Sent</span>
                <strong>{sentEmails.length}</strong>
              </div>

              <div className="stat-card">
                <span>Campaigns</span>
                <strong>0</strong>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Start managing your outreach.</p>
                </div>
              </div>

              <div className="quick-actions">
                <button onClick={() => setPage("create")}>
                  <span>✉</span>
                  <strong>Create Email</strong>
                  <small>Schedule a new email</small>
                </button>

                <button onClick={() => setPage("scheduled")}>
                  <span>◷</span>
                  <strong>View Scheduled</strong>
                  <small>See upcoming emails</small>
                </button>

                <button onClick={() => setPage("campaigns")}>
                  <span>◉</span>
                  <strong>Campaigns</strong>
                  <small>Manage campaigns</small>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CREATE EMAIL */}
        {page === "create" && (
          <section className="form-card">
            <div className="section-header">
              <div>
                <h3>Schedule an Email</h3>
                <p>
                  Create an email and choose when it should be sent.
                </p>
              </div>
            </div>

            <form onSubmit={scheduleEmail}>
              <label>Recipient Email</label>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipient}
                onChange={(e) =>
                  setRecipient(e.target.value)
                }
              />

              <label>Subject</label>
              <input
                type="text"
                placeholder="Email subject"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
              />

              <label>Email Body</label>
              <textarea
                placeholder="Write your email..."
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />

              <label>Schedule Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) =>
                  setScheduledAt(e.target.value)
                }
              />

              {message && (
                <div className="message">
                  {message}
                </div>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Scheduling..."
                  : "Schedule Email"}
              </button>
            </form>
          </section>
        )}

        {/* SCHEDULED */}
        {page === "scheduled" && (
          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Scheduled Emails</h3>
                <p>Your upcoming emails.</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setPage("create")}
              >
                + Create Email
              </button>
            </div>

            {scheduledEmails.length === 0 ? (
              <div className="empty-state">
                <div>◷</div>
                <h3>No scheduled emails</h3>
                <p>
                  Create your first scheduled email.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setPage("create")}
                >
                  Create Email
                </button>
              </div>
            ) : (
              <div className="email-list">
                {scheduledEmails.map((email, index) => (
                  <div className="email-row" key={email.id || index}>
                    <div>
                      <strong>{email.subject}</strong>
                      <span>{email.recipient}</span>
                    </div>

                    <div>
                      {new Date(
                        email.scheduledAt
                      ).toLocaleString()}
                    </div>

                    <span className="status scheduled-status">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SENT */}
        {page === "sent" && (
          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Sent Emails</h3>
                <p>Emails successfully processed by Queuora.</p>
              </div>
            </div>

            {sentEmails.length === 0 ? (
              <div className="empty-state">
                <div>✓</div>
                <h3>No sent emails yet</h3>
                <p>
                  Your completed emails will appear here.
                </p>
              </div>
            ) : (
              <div className="email-list">
                {sentEmails.map((email, index) => (
                  <div className="email-row" key={email.id || index}>
                    <div>
                      <strong>{email.subject}</strong>
                      <span>{email.recipient}</span>
                    </div>

                    <span className="status sent-status">
                      Sent
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* CAMPAIGNS */}
        {page === "campaigns" && (
          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Campaigns</h3>
                <p>
                  Organize and manage your outreach campaigns.
                </p>
              </div>

              <button className="primary-button">
                + New Campaign
              </button>
            </div>

            <div className="empty-state">
              <div>◉</div>
              <h3>No campaigns yet</h3>
              <p>
                Campaign management will be available here.
              </p>
            </div>
          </section>
        )}

        {/* SETTINGS */}
        {page === "settings" && (
          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Account Settings</h3>
                <p>Your Queuora account information.</p>
              </div>
            </div>

            <div className="settings-profile">
              {user.picture ? (
                <img src={user.picture} alt="profile" />
              ) : (
                <div className="large-avatar">
                  {user.name.charAt(0)}
                </div>
              )}

              <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <span className="google-connected">
                  ✓ Google account connected
                </span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;