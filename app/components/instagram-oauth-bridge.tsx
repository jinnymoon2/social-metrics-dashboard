"use client";

import { useEffect, useState } from "react";

type OAuthState = "idle" | "processing" | "error";

async function completeInstagramOAuth(code: string, state: string) {
  const response = await fetch("/api/instagram/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      code,
      state,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data?.error || "Instagram login failed.");
  }

  return data;
}

async function getInstagramStatus() {
  const response = await fetch("/api/instagram/status", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return {
      connected: false,
    };
  }

  return response.json();
}

function notifyParentWindow() {
  try {
    window.localStorage.setItem(
      "instagram_oauth_complete",
      String(Date.now()),
    );
  } catch {
    // Ignore localStorage errors.
  }

  if (window.opener) {
    window.opener.postMessage(
      {
        source: "social-metrics-dashboard",
        provider: "instagram",
        status: "success",
        timestamp: Date.now(),
      },
      window.location.origin,
    );
  }
}

function closePopupSoon() {
  setTimeout(() => {
    window.close();
  }, 500);
}

export function InstagramOAuthBridge() {
  const [oauthState, setOauthState] = useState<OAuthState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const isPopup = Boolean(window.opener);

    function reloadDashboardWindow() {
      if (isPopup) return;

      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      window.location.reload();
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      const data = event.data;

      if (
        data?.source === "social-metrics-dashboard" &&
        data?.provider === "instagram" &&
        data?.status === "success"
      ) {
        reloadDashboardWindow();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === "instagram_oauth_complete") {
        reloadDashboardWindow();
      }
    }

    if (!isPopup) {
      window.addEventListener("message", handleMessage);
      window.addEventListener("storage", handleStorage);

      return () => {
        window.removeEventListener("message", handleMessage);
        window.removeEventListener("storage", handleStorage);
      };
    }
  }, []);

  useEffect(() => {
    async function runPopupBridge() {
      const isPopup = Boolean(window.opener);

      if (!isPopup) return;

      const params = new URLSearchParams(window.location.search);

      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error") || params.get("error_reason");
      const errorDescription = params.get("error_description");

      setOauthState("processing");
      setMessage("Checking Instagram connection...");

      try {
        if (error) {
          throw new Error(errorDescription || error);
        }

        if (code && state) {
          setMessage("Completing Instagram login...");
          await completeInstagramOAuth(code, state);
          notifyParentWindow();
          setMessage("Instagram connected. Closing popup...");
          closePopupSoon();
          return;
        }

        const status = await getInstagramStatus();

        if (status.connected) {
          notifyParentWindow();
          setMessage("Instagram connected. Closing popup...");
          closePopupSoon();
          return;
        }

        setOauthState("idle");
      } catch (caughtError) {
        const errorMessage =
          caughtError instanceof Error
            ? caughtError.message
            : "Instagram login failed.";

        setOauthState("error");
        setMessage(errorMessage);

        if (window.opener) {
          window.opener.postMessage(
            {
              source: "social-metrics-dashboard",
              provider: "instagram",
              status: "error",
              message: errorMessage,
            },
            window.location.origin,
          );
        }

        closePopupSoon();
      }
    }

    runPopupBridge();
  }, []);

  if (oauthState === "idle") {
    return null;
  }

  return (
    <div className="instagramOAuthBridgeOverlay">
      <section className="instagramOAuthBridgeCard">
        <p className="instagramOAuthBridgeEyebrow">Instagram Connection</p>
        <h1>
          {oauthState === "processing"
            ? "Connecting Instagram..."
            : "Instagram login failed"}
        </h1>
        <p>{message}</p>
      </section>
    </div>
  );
}
