import { useState } from "react";
import { listEventTickets } from "../services/ticketService";

export function useAdminAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem("adminToken") || "");
  const [eventId, setEventId] = useState(() => sessionStorage.getItem("eventId") || "");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const isAuthed = !!(token && eventId);

  async function login(inputToken, inputEventId) {
    if (!inputToken || !inputEventId) {
      setLoginError("Both fields are required");
      return false;
    }
    setLoggingIn(true);
    setLoginError("");
    try {
      await listEventTickets(inputEventId, inputToken); // also validates the token, same as legacy
      sessionStorage.setItem("adminToken", inputToken);
      sessionStorage.setItem("eventId", inputEventId);
      setToken(inputToken);
      setEventId(inputEventId);
      return true;
    } catch (err) {
      if (err.status === 401 || err.status === 403) setLoginError("Invalid admin token");
      else setLoginError("Connection failed. Check backend URL in your .env");
      return false;
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    sessionStorage.clear();
    setToken("");
    setEventId("");
  }

  return { token, eventId, isAuthed, loggingIn, loginError, login, logout };
}
