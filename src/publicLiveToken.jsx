import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import socket from "./socket";
import axios from "axios";

function PublicTokenScreen() {
  const { tenantId } = useParams();
  const [searchParams] = useSearchParams();
  const exp = searchParams.get("e");

  const [isExpired, setIsExpired] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);
  const [nextToken, setNextToken] = useState(null);
  const [remainingTokens, setRemainingTokens] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState("en");
  const [blink, setBlink] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());

  const prevTokenRef = useRef(null);
  const audioRef = useRef(null);

  /* 🔒 Expiry check */
  useEffect(() => {
    if (!exp || Date.now() > Number(exp)) {
      setIsExpired(true);
    }
  }, [exp]);

  useEffect(() => {
    audioRef.current = new Audio("/notification.wav");
  }, []);

  /* Initial fetch */
  useEffect(() => {
    if (!tenantId || isExpired) return;

    const fetchInitialToken = async () => {
      try {
        const res = await axios.get(
          `https://tokenizationbackend-production.up.railway.app/api/v1/appointment/${tenantId}/publicLiveToken`
        );

        const data = res.data.data;

        setCurrentToken(data.currentToken ?? null);
        setNextToken(data.nextToken ?? null);
        setRemainingTokens(data.remainingTokens ?? []);
        setHospital(data.hospital ?? null);
        setMessage(getMessageFromState(data.state, lang));

        prevTokenRef.current = data.currentToken ?? null;
      } catch {
        setMessage(
          lang === "en"
            ? "Unable to load token information"
            : "ٹوکن کی معلومات حاصل نہیں ہو سکیں"
        );
      }
    };

    fetchInitialToken();
  }, [tenantId, isExpired, lang]);

  /* Socket updates */
  useEffect(() => {
    if (!tenantId || isExpired) return;

    socket.emit("join-hospital", tenantId);

    const handler = (data) => {
      const newToken = data.currentToken ?? null;

      if (prevTokenRef.current !== null && prevTokenRef.current !== newToken) {
        audioRef.current?.play().catch(() => {});
        setBlink(true);
        setTimeout(() => setBlink(false), 800);
      }

      prevTokenRef.current = newToken;
      setCurrentToken(newToken);
      setNextToken(data.nextToken ?? null);
      setRemainingTokens(data.remainingTokens ?? []);

      if (data.state) {
        setMessage(getMessageFromState(data.state, lang));
      }
    };

    socket.on("token:update", handler);

    return () => {
      socket.off("token:update", handler);
    };
  }, [tenantId, isExpired, lang]);

  /* Clock */
  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* Expired */
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white px-6 py-5 rounded-xl shadow text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Link Expired
          </h2>
          <p className="text-slate-600">
            This token display link was valid until midnight.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-6 flex flex-col items-center space-y-6">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center bg-white px-6 py-4 rounded-lg shadow">
        <div>
          <h2 className="text-xl font-bold">{hospital ?? "Hospital"}</h2>
          <p className="text-slate-500">{hospital?.department ?? "Token Display"}</p>
        </div>
        <div className="font-mono font-semibold">
          {dateTime.toLocaleDateString()} • {dateTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Language */}
      <button
        onClick={() => setLang(lang === "en" ? "ur" : "en")}
        className="self-end px-4 py-2 bg-white shadow rounded-lg"
      >
        {lang === "en" ? "اردو" : "English"}
      </button>

      <h1 className="text-4xl font-bold text-center">
        🏥 {text[lang].title}
      </h1>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 px-6 py-3 rounded-lg font-semibold text-center">
          {message}
        </div>
      )}

      {/* Main Display */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 font-bold">{text[lang].nowServing}</p>
          <div
            className={`text-emerald-600 font-extrabold mt-4 ${
              blink ? "animate-pulse scale-110" : ""
            }`}
            style={{ fontSize: "6rem" }}
          >
            {currentToken ?? "--"}
          </div>

          <p className="mt-6 text-gray-500 font-bold">
            {text[lang].nextToken}
          </p>
          <div className="text-4xl font-bold text-amber-500 mt-2">
            {nextToken ?? "--"}
          </div>
        </div>

        {/* Remaining Queue */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-center font-semibold text-gray-600 mb-3">
            Remaining Queue
          </p>

          <div className="grid grid-cols-3 gap-3">
            {remainingTokens.length === 0 ? (
              <p className="col-span-3 text-center text-gray-400 text-sm">
                —
              </p>
            ) : (
              remainingTokens.map((t) => (
                <div
                  key={t.tokenNumber}
                  className="bg-slate-100 rounded-md py-3 text-center font-bold text-lg text-slate-700"
                >
                  {t.tokenNumber}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="bg-amber-100 px-6 py-4 rounded-lg text-center max-w-3xl">
        <p className="font-bold text-amber-800">
          {text[lang].pleaseWait}
        </p>
        <p className="text-amber-700">
          {text[lang].reachOnTime}
        </p>
      </div>
    </div>
  );
}

/* Helpers unchanged */
const getMessageFromState = (state, lang) => {
  const messages = {
    en: {
      STARTED: "Token service has started",
      ADVANCED: "Please proceed to the counter",
      QUEUE_EMPTY: "All tokens are completed for today",
      NO_APPOINTMENTS: "No appointments available",
    },
    ur: {
      STARTED: "ٹوکن سروس شروع ہو گئی ہے",
      ADVANCED: "براہ کرم کاؤنٹر پر تشریف لائیں",
      QUEUE_EMPTY: "آج کے تمام ٹوکن مکمل ہو گئے",
      NO_APPOINTMENTS: "کوئی اپائنٹمنٹ موجود نہیں",
    },
  };
  return messages[lang]?.[state] ?? "";
};

const text = {
  en: {
    title: "Public Token Display",
    nowServing: "Now Serving",
    nextToken: "Next Token",
    pleaseWait: "Please wait for your turn.",
    reachOnTime: "Arrive on time. Late arrivals may be skipped.",
  },
  ur: {
    title: "ٹوکن اسٹیٹس",
    nowServing: "جاری ٹوکن",
    nextToken: "اگلا ٹوکن",
    pleaseWait: "آپ کو اپنی باری کا انتظار کرنا ہوگا۔",
    reachOnTime: "وقت پر پہنچیں، دیر سے آنے والوں کو چھوڑا جا سکتا ہے۔",
  },
};

export default PublicTokenScreen;
