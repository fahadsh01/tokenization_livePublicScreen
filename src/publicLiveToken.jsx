import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import  socket from "./socket"
import axios  from "axios";
function PublicTokenScreen() {
  const { tenantId } = useParams();
  const [searchParams] = useSearchParams();
  const exp = searchParams.get("e");
  const [isExpired, setIsExpired] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);
  const [nextToken, setNextToken] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState("en");
  const [blink, setBlink] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const prevTokenRef = useRef(null);
  const audioRef = useRef(null);
   useEffect(() => {
    audioRef.current = new Audio("/notification.wav");
  }, []);

  useEffect(() => {

    const fetchInitialToken = async () => {
      try {
        const res = await axios.get(
          `https://tokenizationbackend-production.up.railway.app/api/v1/appointment/${tenantId}/publicLiveToken`
        );

        const data = res.data.data;
        setCurrentToken(data.currentToken ?? null);
        setNextToken(data.nextToken ?? null);
        setHospital(data.hospital ?? null);
        setMessage(getMessageFromState(data.state, lang));
        prevTokenRef.current = data.currentToken ?? null;
      } catch (err) {
        setMessage(
          lang === "en"
            ? "Unable to load token information"
            : "ٹوکن کی معلومات حاصل نہیں ہو سکیں"
        );
      }
    };

    fetchInitialToken();
  }, [tenantId, ]);

 useEffect(() => {
  if (!tenantId ) return;
  const onConnect = () => {
    console.log("🟢 socket connected, joining hospital:", tenantId);
    socket.emit("join-hospital", tenantId);
  };

  socket.on("connect", onConnect);

  const handler = (data) => {
    console.log("📥 token:update received:", data);

    const newToken = data.currentToken ?? null;

    if (prevTokenRef.current !== null && prevTokenRef.current !== newToken) {
      audioRef.current?.play().catch(() => {});
      setBlink(true);
      setTimeout(() => setBlink(false), 800);
    }

    prevTokenRef.current = newToken;
    setCurrentToken(newToken);
    setNextToken(data.nextToken ?? null);

    if (data.state) {
      setMessage(getMessageFromState(data.state, lang));
    }
  };

  socket.on("token:update", handler);

  return () => {
    socket.off("connect", onConnect);
    socket.off("token:update", handler);
  };
}, [tenantId,]);


  /* Clock */
  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-100 px-4 py-6 space-y-4">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between bg-white shadow rounded-xl px-4 py-3">
        <div>
          <h2 className="text-xl font-bold">{hospital ?? "Hospital"}</h2>
          <p className="text-slate-500">
            {hospital?.department ?? "Token Display"}
          </p>
        </div>
        <p className="font-mono font-semibold">
          {dateTime.toLocaleDateString()} • {dateTime.toLocaleTimeString()}
        </p>
      </div>

      {/* Language Toggle */}
      <button
        onClick={() => setLang(lang === "en" ? "ur" : "en")}
        className="self-end px-4 py-2 rounded-lg bg-white shadow"
      >
        {lang === "en" ? "اردو" : "English"}
      </button>

      <h1 className="text-3xl font-bold text-center">
        🏥 {text[lang].title}
      </h1>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 px-6 py-3 rounded-xl text-center font-semibold">
          {message}
        </div>
      )}

      {/* Current Token */}
      <div className="bg-white shadow rounded-lg px-6 py-8 text-center">
        <p className="font-bold text-gray-500">{text[lang].nowServing}</p>
        <div
          className={`text-emerald-600 font-extrabold mt-2 ${
            blink ? "animate-pulse scale-110" : ""
          }`}
          style={{ fontSize: "5rem" }}
        >
          {currentToken ?? "--"}
        </div>
      </div>

      {/* Next Token */}
      <div className="bg-white shadow rounded-lg px-6 py-4 text-center">
        <p className="font-bold text-gray-500">{text[lang].nextToken}</p>
        <div className="text-3xl font-bold text-amber-500">
          {nextToken ?? "--"}
        </div>
      </div>

      <div className="bg-amber-100 px-6 py-4 rounded-lg text-center">
        <p className="font-bold text-amber-800">{text[lang].pleaseWait}</p>
        <p className="text-amber-700">{text[lang].reachOnTime}</p>
      </div>
    </div>
  );
}

/* Helpers */
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
    pleaseWait: "You have to wait for your turn.",
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
