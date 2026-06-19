"use client";

import { useEffect, useRef, useState } from "react";

type InstagramProfile = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

type InstagramConnection = {
  userId: number;
  permissions: string[];
  shortLivedAccessToken: string;
  longLivedAccessToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  profile: InstagramProfile | null;
};

type ExchangeResponse = {
  ok: boolean;
  connection?: InstagramConnection;
  error?: string;
};

type InstagramConnectionPanelProps = {
  initialCode: string | null;
  initialError: string | null;
  initialErrorDescription: string | null;
  instagramRedirectUri: string;
};

const STORAGE_KEY = "social_metrics_instagram_connection";

export default function InstagramConnectionPanel({
  initialCode,
  initialError,
  initialErrorDescription,
  instagramRedirectUri
}: InstagramConnectionPanelProps) {
  const hasExchangedCodeRef = useRef(false);

  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  const [message, setMessage] = useState("");
  const [debugMessage, setDebugMessage] = useState("");
  const [connection, setConnection] = useState<InstagramConnection | null>(null);

  useEffect(() => {
    const savedConnection = window.localStorage.getItem(STORAGE_KEY);

    if (!savedConnection) {
      setDebugMessage("No saved Instagram connection found in this browser.");
      return;
    }

    try {
      const parsed = JSON.parse(savedConnection) as InstagramConnection;
      setConnection(parsed);
      setStatus("connected");
      setMessage("Instagram account is connected.");
      setDebugMessage("Loaded Instagram connection from localStorage.");
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setDebugMessage("Removed invalid saved Instagram connection.");
    }
  }, []);

  useEffect(() => {
    if (initialError) {
      setStatus("error");
      setMessage(
        initialErrorDescription
          ? `Instagram authorization failed: ${initialErrorDescription}`
          : `Instagram authorization failed: ${initialError}`
      );
      setDebugMessage(`Instagram returned an OAuth error: ${initialError}`);
      cleanUrl();
      return;
    }

    if (!initialCode) {
      return;
    }

    if (hasExchangedCodeRef.current) {
      return;
    }

    hasExchangedCodeRef.current = true;

    const codeFromCallback = initialCode;

    async function exchangeCode() {
      try {
        setStatus("connecting");
        setMessage("Connecting Instagram account...");
        setDebugMessage("Received Instagram code from URL. Exchanging token...");

        const cleanCode = codeFromCallback.replace("#_", "").trim();

        const response = await fetch("/api/instagram/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: cleanCode }),
        });

        const data = (await response.json()) as ExchangeResponse;

        if (!response.ok || !data.ok || !data.connection) {
          throw new Error(data.error || "Instagram token exchange failed");
        }

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data.connection)
        );

        setConnection(data.connection);
        setStatus("connected");
        setMessage("Instagram account connected successfully.");
        setDebugMessage("Token exchange succeeded and connection was saved.");
        cleanUrl();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown Instagram connection error";

        setStatus("error");
        setMessage(errorMessage);
        setDebugMessage("Token exchange failed. Check Vercel function logs.");
        cleanUrl();
      }
    }

    exchangeCode();
  }, [initialCode, initialError, initialErrorDescription]);

  function cleanUrl() {
    const cleanPath = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanPath);
  }

  function disconnectInstagram() {
    window.localStorage.removeItem(STORAGE_KEY);
    setConnection(null);
    setStatus("idle");
    setMessage("Instagram account disconnected from this browser.");
    setDebugMessage("Removed Instagram connection from localStorage.");
  }

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <p className="eyebrow">Instagram connection</p>
          <h2>Connect Instagram Business</h2>
        </div>

        <span className={`statusBadge ${status}`}>
          {status === "connected"
            ? "Connected"
            : status === "connecting"
              ? "Connecting"
              : status === "error"
                ? "Error"
                : "Not connected"}
        </span>
      </div>

      <p className="description">
        Connect an Instagram professional account to prepare metrics such as
        follower count, media count, and insights.
      </p>

      {message ? (
        <div className={`messageBox ${status}`}>
          <p>{message}</p>
        </div>
      ) : null}

      <div className="messageBox">
        <p>
          <strong>Debug:</strong> {debugMessage || "Waiting for Instagram login."}
        </p>
        <p>
          <strong>Code detected:</strong> {initialCode ? "Yes" : "No"}
        </p>
      </div>

      {connection ? (
        <div className="connectionDetails">
          <div className="metric">
            <span>User ID</span>
            <strong>{connection.userId}</strong>
          </div>

          <div className="metric">
            <span>Username</span>
            <strong>
              {connection.profile?.username
                ? `@${connection.profile.username}`
                : "Not available"}
            </strong>
          </div>

          <div className="metric">
            <span>Account type</span>
            <strong>{connection.profile?.account_type || "Not available"}</strong>
          </div>

          <div className="metric">
            <span>Media count</span>
            <strong>{connection.profile?.media_count ?? "Not available"}</strong>
          </div>

          <div className="metric">
            <span>Followers</span>
            <strong>
              {connection.profile?.followers_count ?? "Not available"}
            </strong>
          </div>

          <div className="metric">
            <span>Token expiry</span>
            <strong>
              {connection.expiresIn
                ? `${Math.floor(connection.expiresIn / 86400)} days`
                : "Short-lived only"}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="actions">
        <a className="primaryButton" href="/api/instagram/connect">
          Connect Instagram
        </a>

        {connection ? (
          <button className="secondaryButton" onClick={disconnectInstagram}>
            Disconnect
          </button>
        ) : null}
      </div>

      <div className="debugBox">
        <p>
          Required redirect URI (add this exact value to your Meta app dashboard
          under "Valid OAuth Redirect URIs"):
        </p>
        <p>
          <code>{instagramRedirectUri || "Not configured"}</code>
        </p>
      </div>
    </section>
  );
}
