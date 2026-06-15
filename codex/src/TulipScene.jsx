import { useMemo, useState, useEffect, useRef } from "react";
import BirthdayCanvas from "./BirthdayCanvas.jsx";

const sprinkleColors = ["#ffffff", "#7ef9ff", "#ff6df2", "#ffe769", "#a98bff"];

function makeStars(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${1 + Math.random() * 2.8}px`,
    delay: `${Math.random() * 4}s`,
    duration: `${2.6 + Math.random() * 3.4}s`
  }));
}

function Sparkles({ blown }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        angle: index * 20,
        distance: 74 + Math.random() * 52,
        delay: `${index * 0.018}s`
      })),
    []
  );

  return (
    <div className={`spark-burst ${blown ? "is-visible" : ""}`} aria-hidden="true">
      {sparks.map((spark) => (
        <span
          key={spark.id}
          style={{
            "--angle": `${spark.angle}deg`,
            "--distance": `${spark.distance}px`,
            "--delay": spark.delay
          }}
        />
      ))}
    </div>
  );
}

function Cake({ blown, onBlow, disabled }) {
  const sprinkles = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        id: index,
        left: `${10 + Math.random() * 80}%`,
        top: `${18 + Math.random() * 62}%`,
        color: sprinkleColors[index % sprinkleColors.length],
        rotate: `${Math.random() * 180}deg`
      })),
    []
  );

  return (
    <button
      className={`cake-button ${blown ? "is-blown" : ""} ${disabled ? "is-locked" : ""}`}
      type="button"
      onClick={disabled ? undefined : onBlow}
      aria-label={blown ? "Magic candle blown" : "Tap to blow the magic candle"}
    >
      <Sparkles blown={blown} />
      <div className="cake-glow" />
      <div className="candle">
        <div className="wick" />
        <div className="flame" />
        <div className="smoke">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="cake">
        <div className="tier tier-top">
          {sprinkles.slice(0, 9).map((sprinkle) => (
            <span
              key={sprinkle.id}
              className="sprinkle"
              style={{
                left: sprinkle.left,
                top: sprinkle.top,
                background: sprinkle.color,
                transform: `rotate(${sprinkle.rotate})`
              }}
            />
          ))}
        </div>
        <div className="tier tier-middle">
          {sprinkles.slice(9, 22).map((sprinkle) => (
            <span
              key={sprinkle.id}
              className="sprinkle"
              style={{
                left: sprinkle.left,
                top: sprinkle.top,
                background: sprinkle.color,
                transform: `rotate(${sprinkle.rotate})`
              }}
            />
          ))}
        </div>
        <div className="tier tier-bottom">
          {sprinkles.slice(22).map((sprinkle) => (
            <span
              key={sprinkle.id}
              className="sprinkle"
              style={{
                left: sprinkle.left,
                top: sprinkle.top,
                background: sprinkle.color,
                transform: `rotate(${sprinkle.rotate})`
              }}
            />
          ))}
        </div>
        <div className="cake-plate" />
      </div>
    </button>
  );
}

const BIRTHDAY = new Date("2026-06-16T00:00:00");
// She turned 19 on June 16, 2025
const PREV_BIRTHDAY = new Date("2025-06-16T00:00:00");

function getAgeDisplay() {
  const now = Date.now();
  if (now >= BIRTHDAY.getTime()) return null; // it's her birthday!
  const elapsed = now - PREV_BIRTHDAY.getTime();
  const totalSec = Math.floor(elapsed / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return { years: 19, days, hours, mins, secs };
}

export default function TulipScene() {
  const [blown, setBlown] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getAgeDisplay);
  const stars = useMemo(() => makeStars(90), []);
  const timerRef = useRef(null);
  const blownRef = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const left = getAgeDisplay();
      setTimeLeft(left);
      // Auto-blow exactly at midnight
      if (!left && !blownRef.current) {
        blownRef.current = true;
        clearInterval(timerRef.current);
        handleBlow();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  function handleBlow() {
    setBlown(true);
    setTimeout(() => setShowCanvas(true), 1800);
  }

  if (showCanvas) {
    return <BirthdayCanvas />;
  }

  const isBirthday = !timeLeft;

  return (
    <section className={`birthday-screen ${blown ? "is-celebrating" : ""}`}>
      <div className="star-field" aria-hidden="true">
        {stars.map((star) => (
          <span
            key={star.id}
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}
      </div>

      <div className="birthday-content">
        {!isBirthday && !blown && timeLeft && (
          <div className="countdown">
            <div className="countdown-age">
              <span className="age-num">{timeLeft.years}</span>
              <span className="age-label">years</span>
              <span className="age-num">{timeLeft.days}</span>
              <span className="age-label">days</span>
            </div>
            <div className="countdown-units">
              <div className="countdown-unit"><span>{String(timeLeft.hours).padStart(2,"0")}</span><small>hrs</small></div>
              <div className="countdown-sep">:</div>
              <div className="countdown-unit"><span>{String(timeLeft.mins).padStart(2,"0")}</span><small>min</small></div>
              <div className="countdown-sep">:</div>
              <div className="countdown-unit"><span>{String(timeLeft.secs).padStart(2,"0")}</span><small>sec</small></div>
            </div>
          </div>
        )}
        <Cake blown={blown} onBlow={isBirthday ? handleBlow : undefined} disabled={!isBirthday} />
        {!isBirthday && !blown && (
          <p className="countdown-hint">turns 20 on june 16 🎂</p>
        )}
      </div>
    </section>
  );
}
