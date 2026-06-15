import { useEffect, useRef, useState } from "react";

function random(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function bezier(cp, t) {
  const p1 = { x: cp[0].x * (1 - t) * (1 - t), y: cp[0].y * (1 - t) * (1 - t) };
  const p2 = { x: cp[1].x * 2 * t * (1 - t), y: cp[1].y * 2 * t * (1 - t) };
  const p3 = { x: cp[2].x * t * t, y: cp[2].y * t * t };
  return { x: p1.x + p2.x + p3.x, y: p1.y + p2.y + p3.y };
}

function inheart(x, y, r) {
  const xr = x / r, yr = y / r;
  const z = (xr * xr + yr * yr - 1) ** 3 - xr * xr * yr * yr * yr;
  return z < 0;
}

function makeHeartPoints() {
  const points = [];
  for (let i = 10; i < 30; i += 0.2) {
    const t = i / Math.PI;
    points.push({
      x: 16 * Math.pow(Math.sin(t), 3),
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    });
  }
  return points;
}

// Draw static decorative background elements (moon, stars, blobs)
function drawBackground(ctx, w, h) {
  // Dark blue background
  ctx.fillStyle = "#08061a";
  ctx.fillRect(0, 0, w, h);

  // Moon — left side, upper area
  const moonX = w * 0.14, moonY = h * 0.22, moonR = w * 0.11;
  ctx.save();
  ctx.fillStyle = "#e8e8f0";
  ctx.shadowColor = "rgba(220,220,255,0.6)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, 2 * Math.PI);
  ctx.fill();
  // crescent cutout
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.38, moonY - moonR * 0.1, moonR * 0.82, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  // Colorful blobs — top right
  const blobs = [
    { x: w * 0.82, y: h * 0.04, r: w * 0.13, color: "#ff5588" },
    { x: w * 0.96, y: h * 0.12, r: w * 0.09, color: "#ffcc33" },
    { x: w * 0.88, y: h * 0.14, r: w * 0.07, color: "#ff8822" },
  ];
  for (const blob of blobs) {
    ctx.save();
    ctx.fillStyle = blob.color;
    ctx.shadowColor = blob.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
}


class TreeEngine {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = width;
    this.height = height;
    this.heartPoints = makeHeartPoints();
    this.blooms = [];
    this.bloomsCache = [];
    this.footerLength = 0;

    // Tree centered, base near bottom
    this.treeBaseX = width * 0.50;
    this.treeBaseY = height * 0.92;

    // Seed shown before tap — center of screen
    this.seedX = width / 2;
    this.seedY = height * 0.40;
    this.seedScale = 2.2;

    this._initBranches(width, height);
    this._initBlooms(width, height);
  }

  _initBranches(w, h) {
    const bx = this.treeBaseX;
    const by = this.treeBaseY;
    // Tree: 45% of screen height, good width
    const xsc = (w / 1100) * 1.1;
    const ysc = (h / 680) * 0.58;

    const b = (x1, y1, x2, y2, x3, y3, r, l, children) => ({
      x1: bx + (x1 - 535) * xsc,
      y1: by + (y1 - 680) * ysc,
      x2: bx + (x2 - 535) * xsc,
      y2: by + (y2 - 680) * ysc,
      x3: bx + (x3 - 535) * xsc,
      y3: by + (y3 - 680) * ysc,
      r: r * 0.55, l, children: children || [], len: 0
    });

    this.branchDefs = [
      b(535,680, 570,250, 500,200, 30,100, [
        b(540,500, 455,417, 340,400, 13,100, [
          b(450,435, 434,430, 394,395, 2,40)
        ]),
        b(550,445, 600,356, 680,345, 12,100, [
          b(578,400, 648,409, 661,426, 3,80)
        ]),
        b(539,281, 537,248, 534,217, 3,40),
        b(546,397, 413,247, 328,244, 9,80, [
          b(427,286, 383,253, 371,205, 2,40),
          b(498,345, 435,315, 395,330, 4,60)
        ]),
        b(546,357, 608,252, 678,221, 6,100, [
          b(590,293, 646,277, 648,271, 2,80)
        ])
      ])
    ];
    this.activeBranches = this.branchDefs.map(d => ({ ...d, radius: d.r }));

    // Tree top = where trunk reaches (y=200 in original coords)
    this.treeTopY = by + (200 - 680) * (h / 680) * 0.58;
  }

  _initBlooms(w, h) {
    // Heart centre sits right at the tree top, large enough to fill ~55% screen width
    const cx = this.treeBaseX;
    const cy = this.treeTopY !== undefined ? this.treeTopY : this.treeBaseY - h * 0.32;
    const r = w * 0.30;          // big heart radius
    const bw = r * 2.8, bh = r * 2.5;

    for (let i = 0; i < 220; i++) {
      let tries = 0;
      while (tries++ < 2000) {
        const x = cx - bw / 2 + Math.random() * bw;
        const y = cy - bh / 2 + Math.random() * bh;
        if (inheart(x - cx, cy - y, r)) {
          this.bloomsCache.push({
            x, y,
            color: `rgb(255,${random(0, 160)},${random(100, 220)})`,
            alpha: 0.65 + Math.random() * 0.35,
            angle: random(0, 360),
            scale: 0.06,
          });
          break;
        }
      }
    }
  }

  drawSeed() {
    const ctx = this.ctx;
    const { heartPoints, seedX, seedY, seedScale } = this;
    ctx.save();
    ctx.fillStyle = "#ff8cc8";
    ctx.shadowColor = "#ff5cf0";
    ctx.shadowBlur = 22;
    ctx.translate(seedX, seedY);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const p of heartPoints) {
      ctx.lineTo(p.x * seedScale, -p.y * seedScale);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  shrinkStep() {
    // Redraw background + shrinking seed
    drawBackground(this.ctx, this.width, this.height);
    this.drawSeed();
    this.seedScale *= 0.90;
    return this.seedScale > 0.14;
  }

  _growBranch(def) {
    const ctx = this.ctx;
    const t = def.len <= def.l ? def.len / def.l : 1;
    const p = bezier(
      [{ x: def.x1, y: def.y1 }, { x: def.x2, y: def.y2 }, { x: def.x3, y: def.y3 }],
      t
    );
    const radius = def.radius * Math.pow(0.97, def.len);
    ctx.save();
    ctx.fillStyle = "#e8a0c8";
    ctx.shadowBlur = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(radius, 0.5), 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    def.len += 1;
    if (def.len > def.l) return def.children || [];
    return null;
  }

  growStep() {
    if (!this.activeBranches.length) return false;
    const next = [];
    for (const branch of this.activeBranches) {
      const result = this._growBranch(branch);
      if (result === null) next.push(branch);
      else next.push(...result.map(d => ({ ...d, radius: d.r })));
    }
    this.activeBranches = next;
    return this.activeBranches.length > 0;
  }

  flowerStep() {
    const add = this.bloomsCache.splice(0, 5);
    this.blooms.push(...add);
    for (const bloom of this.blooms) {
      this._drawBloom(bloom);
      bloom.scale += 0.10;
    }
    this.blooms = this.blooms.filter(b => b.scale <= 1.02);
    return this.bloomsCache.length > 0 || this.blooms.length > 0;
  }

  _drawBloom(bloom) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = bloom.color;
    ctx.globalAlpha = bloom.alpha;
    ctx.translate(bloom.x, bloom.y);
    ctx.scale(bloom.scale, bloom.scale);
    ctx.rotate(bloom.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const p of this.heartPoints) {
      ctx.lineTo(p.x, -p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  footerStep() {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height - 10;
    const half = this.footerLength / 2;

    ctx.save();
    // Cyan/teal glowing line like the reference
    const grad = ctx.createLinearGradient(cx - half, cy, cx + half, cy);
    grad.addColorStop(0, "rgba(0,255,255,0)");
    grad.addColorStop(0.2, "#00ffee");
    grad.addColorStop(0.5, "#7ef9ff");
    grad.addColorStop(0.8, "#00ffee");
    grad.addColorStop(1, "rgba(0,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.shadowColor = "#00ffee";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy);
    ctx.lineTo(cx + half, cy);
    ctx.stroke();

    // Glowing dot at center
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx - half, cy, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + half, cy, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    if (this.footerLength < this.width * 1.05) {
      this.footerLength += 9;
      return true;
    }
    return false;
  }
}

const MESSAGE = "jaaanuuuu happy birthday 🎂❤️";

const TRIP_PLACES = [
  { name: "Ladakh",          src: "/places/ladakh.png" },
  { name: "Spiti",           src: "/places/spiti.png" },
  { name: "Tawang",          src: "/places/tawang.png" },
  { name: "Sikkim",          src: "/places/sikkim.png" },
  { name: "Valley of Flowers", src: "/places/valleyofflowers.png" },
];

function WillYouPage() {
  const [noPos, setNoPos] = useState({ x: null, y: null });
  const [noAttempts, setNoAttempts] = useState(0);
  const [yesClicked, setYesClicked] = useState(false);
  const containerRef = useRef(null);
  const noBtnRef = useRef(null);

  function runAway(e) {
    e.preventDefault();
    const container = containerRef.current;
    const btn = noBtnRef.current;
    if (!container || !btn) return;
    const cBox = container.getBoundingClientRect();
    const bBox = btn.getBoundingClientRect();
    const maxX = cBox.width - bBox.width - 8;
    const maxY = cBox.height - bBox.height - 8;
    setNoPos({
      x: 8 + Math.random() * maxX,
      y: 8 + Math.random() * maxY,
    });
    setNoAttempts(prev => prev + 1);
  }

  if (yesClicked) {
    return (
      <div className="willyou-page">
        <p className="willyou-yes-text">thenks thamburatti 🥰❤️</p>
      </div>
    );
  }

  return (
    <div className="willyou-page" ref={containerRef} style={{ position: "relative" }}>
      <div className="willyou-emoji">🐷💕</div>
      <p className="willyou-question">rajaav ne varille?</p>
      <div className="willyou-buttons">
        <button className="willyou-yes" onClick={() => setYesClicked(true)}>
          Yes 💕
        </button>
        <button
          ref={noBtnRef}
          className="willyou-no"
          style={
            noPos.x !== null
              ? { position: "absolute", left: noPos.x, top: noPos.y, transition: "left 0.15s ease, top 0.15s ease" }
              : {}
          }
          onMouseEnter={runAway}
          onTouchStart={runAway}
        >
          No 🙃
        </button>
      </div>
      {noAttempts > 0 && (
        <p className="willyou-taunt">
          chette no click cheyaan nokuno 😊 atleast porter ayengilum 😄
        </p>
      )}
    </div>
  );
}

function RoadTripPage({ onDone }) {
  const [visibleCards, setVisibleCards] = useState([]);

  useEffect(() => {
    TRIP_PLACES.forEach((_, i) => {
      setTimeout(() => {
        setVisibleCards(prev => [...prev, i]);
      }, 400 + i * 350);
    });
    // After all cards appear + 5s, move to next screen
    const total = 400 + (TRIP_PLACES.length - 1) * 350 + 4000;
    const t = setTimeout(onDone, total);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="roadtrip-page">
      <p className="roadtrip-text">
        raajaav yaya cringe anen ariyaam hehe still 🥺
      </p>
      <p className="roadtrip-subtext">
        what if we go on a road trip someday? 🏔️🚗
      </p>
      <div className="places-grid">
        {TRIP_PLACES.map((place, i) => (
          <div
            key={place.name}
            className={`place-card ${visibleCards.includes(i) ? "place-card--in" : ""}`}
            style={{ "--delay": `${i * 0.06}s` }}
          >
            <img src={place.src} alt={place.name} className="place-img" />
            <span className="place-label">{place.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BirthdayCanvas() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef("idle");
  const audioRef = useRef(null);
  const [typedText, setTypedText] = useState("");
  const [showText, setShowText] = useState(false);
  const [showRoadTrip, setShowRoadTrip] = useState(false);
  const [showWillYou, setShowWillYou] = useState(false);
  const charIndexRef = useRef(0);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    drawBackground(canvas.getContext("2d"), w, h);
    engineRef.current = new TreeEngine(canvas, w, h);
    engineRef.current.drawSeed();
    // Auto-start after a short pause so the seed is visible briefly
    setTimeout(() => startAnimation(), 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  function startAnimation() {
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "shrink";

    if (audioRef.current) {
      audioRef.current.volume = 0.75;
      audioRef.current.play().catch(() => {});
    }

    function tick() {
      const eng = engineRef.current;
      const phase = phaseRef.current;

      if (phase === "shrink") {
        const more = eng.shrinkStep();
        if (!more) phaseRef.current = "grow";
      } else if (phase === "grow") {
        const more = eng.growStep();
        eng.footerStep();
        if (!more) phaseRef.current = "flower";
      } else if (phase === "flower") {
        const more = eng.flowerStep();
        eng.footerStep();
        if (!more) {
          phaseRef.current = "text";
          setShowText(true);
          startTypewriter();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function startTypewriter() {
    charIndexRef.current = 0;
    typeNext();
  }

  function typeNext() {
    const charIdx = charIndexRef.current;
    if (charIdx <= MESSAGE.length) {
      setTypedText(MESSAGE.slice(0, charIdx) + (charIdx < MESSAGE.length ? "▌" : ""));
      charIndexRef.current += 1;
      typingTimerRef.current = setTimeout(typeNext, 75);
    } else {
      // Typing done — transition to road trip page
      typingTimerRef.current = setTimeout(() => setShowRoadTrip(true), 900);
    }
  }

  if (showWillYou) {
    return (
      <div className="canvas-screen">
        <audio ref={audioRef} src="/happybday/aud.mp3" loop autoPlay />
        <WillYouPage />
      </div>
    );
  }

  if (showRoadTrip) {
    return (
      <div className="canvas-screen">
        <audio ref={audioRef} src="/happybday/aud.mp3" loop autoPlay />
        <RoadTripPage onDone={() => setShowWillYou(true)} />
      </div>
    );
  }

  return (
    <div className="canvas-screen">
      <audio ref={audioRef} src="/happybday/aud.mp3" loop />
      <canvas ref={canvasRef} className="tree-canvas" />

      {showText && (
        <div className="message-overlay">
          <p className="msg-line">{typedText}</p>
        </div>
      )}
    </div>
  );
}
