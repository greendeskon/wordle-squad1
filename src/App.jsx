import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { Sword, ClipboardCheck, History, User } from "lucide-react";
// Deploying to Squad 1
// ─────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────

function getTodayWordleNumber() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const base  = new Date(2021, 5, 19);
  return Math.floor((today - base) / 86400000);
}

function todayDateStr() {
  return new Date().toDateString();
}

function parseWordle(text) {
  const match = text.match(/Wordle\s+([\d,]+)\s+([1-6X])\/6/i);
  if (!match) return null;
  const puzzle = parseInt(match[1].replace(/,/g, ""));
  const score  = match[2] === "X" ? 7 : parseInt(match[2]);
  return { puzzle, score, failed: match[2] === "X" };
}

function calculateStreak(entries) {
  if (!entries.length) return 0;
  const won = entries.filter(e => !e.failed).sort((a, b) => b.puzzle_no - a.puzzle_no);
  if (!won.length) return 0;
  const today = getTodayWordleNumber();
  if (won[0].puzzle_no < today - 1) return 0;
  let streak = 1;
  for (let i = 1; i < won.length; i++) {
    if (won[i].puzzle_no === won[i - 1].puzzle_no - 1) streak++;
    else break;
  }
  return streak;
}

function generateTrophy(score, streak, puzzle, playerName) {
  const canvas  = document.createElement("canvas");
  canvas.width  = 600;
  canvas.height = 400;
  const ctx     = canvas.getContext("2d");
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, 600, 400);
  ctx.strokeStyle = "#6aff8e";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 576, 376);
  [[12,12],[588,12],[12,388],[588,388]].forEach(([x,y]) => {
    ctx.fillStyle = "#6aff8e";
    ctx.fillRect(x-4, y-4, 8, 8);
  });
  ctx.fillStyle = "#6aff8e";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WORDLE SQUAD", 300, 52);
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 66); ctx.lineTo(540, 66); ctx.stroke();
  ctx.fillStyle = "#555";
  ctx.font = "13px monospace";
  ctx.fillText((playerName || "PLAYER").toUpperCase(), 300, 90);
  const scoreText = score === 7 ? "X/6" : `${score}/6`;
  ctx.fillStyle = score <= 3 ? "#6aff8e" : score <= 5 ? "#ffd700" : "#ff6b6b";
  ctx.font = "bold 108px monospace";
  ctx.fillText(scoreText, 300, 218);
  ctx.fillStyle = "#444";
  ctx.font = "13px monospace";
  ctx.fillText(`WORDLE #${puzzle}`, 300, 254);
  ctx.fillStyle = "#ff9f43";
  ctx.font = "bold 20px monospace";
  ctx.fillText(`🔥 ${streak} DAY STREAK`, 300, 306);
  ctx.fillStyle = "#333";
  ctx.font = "11px monospace";
  ctx.fillText(new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}), 300, 366);
  const link    = document.createElement("a");
  link.download = `wordle-trophy-${puzzle}.png`;
  link.href     = canvas.toDataURL("image/png");
  link.click();
}

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

const C = {
  bg:"#0f0f0f", surface:"#1a1a1a", border:"#2a2a2a",
  accent:"#6aff8e", accentDim:"#1a3d26",
  text:"#f0f0f0", muted:"#555", muted2:"#888",
  gold:"#ffd700", silver:"#c0c0c0", bronze:"#cd7f32",
  red:"#ff6b6b", orange:"#ff9f43", yellow:"#ffd93d",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'Syne',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
  .app{max-width:520px;margin:0 auto;padding:0 0 82px}
  .ph{padding:28px 20px 0;margin-bottom:20px}
  .ph h1{font-size:1.85rem;font-weight:800;letter-spacing:-1.5px;line-height:1}
  .ph h1 span{color:${C.accent}}
  .ph p{color:${C.muted2};font-size:0.8rem;margin-top:5px}
  .bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:520px;background:${C.surface};border-top:1px solid ${C.border};display:flex;z-index:200}
  .ni{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 0 13px;border:none;background:transparent;color:${C.muted};cursor:pointer;font-family:'Space Mono',monospace;font-size:0.58rem;letter-spacing:0.08em;gap:3px;transition:color 0.15s}
.ni .ic {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  margin-bottom: 2px;
  transition: transform 0.2s ease;
}

/* This makes the icon pop slightly when active */
.ni.on .ic {
  transform: scale(1.1);
  color: ${C.accent};
}

.ni svg {
  stroke-width: 2.5px; /* Makes icons look better on high-res mobile screens */
}  .ni.on{color:${C.accent}}
  .card{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:20px;margin:0 16px 12px}
  .ct{font-size:0.66rem;font-weight:700;letter-spacing:0.12em;color:${C.muted2};text-transform:uppercase;margin-bottom:13px;font-family:'Space Mono',monospace}
  .inp{width:100%;background:${C.bg};border:1px solid ${C.border};border-radius:10px;color:${C.text};font-family:'Syne',sans-serif;font-size:0.88rem;padding:12px 14px;outline:none;transition:border-color 0.2s}
  .inp:focus{border-color:${C.accent}}
  textarea.inp{min-height:128px;resize:none;font-family:'Space Mono',monospace;font-size:0.76rem;line-height:1.7}
  .btn{background:${C.accent};color:#000;border:none;border-radius:10px;padding:13px 20px;font-family:'Syne',sans-serif;font-weight:700;font-size:0.86rem;cursor:pointer;width:100%;transition:all 0.15s}
  .btn:hover{opacity:0.85;transform:translateY(-1px)}
  .btn:active{transform:translateY(0)}
  .btn:disabled{opacity:0.32;cursor:not-allowed;transform:none}
  .ghost{background:transparent;border:1px solid ${C.border};color:${C.text}}
  .ghost:hover{border-color:${C.accent};color:${C.accent};background:transparent}
  .bsm{padding:8px 14px;font-size:0.76rem;width:auto;border-radius:8px}
  .badge{display:inline-flex;align-items:center;gap:4px;font-family:'Space Mono',monospace;font-size:0.6rem;font-weight:700;letter-spacing:0.08em;padding:3px 8px;border-radius:5px}
  .bg-g{background:rgba(106,255,142,0.1);color:${C.accent};border:1px solid rgba(106,255,142,0.28)}
  .bg-y{background:rgba(255,217,61,0.1);color:${C.yellow};border:1px solid rgba(255,217,61,0.28)}
  .acard{background:${C.surface};border:1px solid ${C.border};border-radius:14px;padding:15px 18px;margin:0 16px 10px;cursor:pointer;transition:border-color 0.15s;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .acard:hover{border-color:${C.accent}}
  .aname{font-weight:700;font-size:0.95rem}
  .ameta{color:${C.muted2};font-family:'Space Mono',monospace;font-size:0.68rem;margin-top:3px}
  .stabs{display:flex;gap:4px;background:${C.bg};border:1px solid ${C.border};border-radius:10px;padding:4px;margin-bottom:14px}
  .st{flex:1;padding:8px;border:none;border-radius:7px;background:transparent;color:${C.muted2};cursor:pointer;font-family:'Syne',sans-serif;font-size:0.76rem;font-weight:600;transition:all 0.15s}
  .st.on{background:${C.accent};color:#000}
  .lbr{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid ${C.border}}
  .lbr:last-child{border-bottom:none}
  .tdr{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid ${C.border}}
  .tdr:last-child{border-bottom:none}
  .sbanner{background:linear-gradient(135deg,#1e1200,#160f00);border:1px solid rgba(255,159,67,0.22);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;margin:0 16px 12px}
  .snum{font-family:'Space Mono',monospace;font-size:2.6rem;font-weight:700;color:${C.orange};line-height:1;min-width:60px;text-align:center}
  .slbl strong{display:block;color:${C.orange};font-weight:700;font-size:0.88rem}
  .slbl small{color:${C.muted2};font-size:0.73rem}
  .lbox{background:linear-gradient(135deg,#0d1f0d,#091409);border:1px solid rgba(106,255,142,0.22);border-radius:14px;padding:28px 20px;text-align:center;margin:0 16px 12px}
  .lsc{font-family:'Space Mono',monospace;font-size:3rem;font-weight:700;line-height:1}
  .lmt{font-family:'Space Mono',monospace;font-size:0.7rem;color:${C.muted2};margin-top:6px;letter-spacing:0.1em}
  .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 16px 12px}
  .scard{background:${C.surface};border:1px solid ${C.border};border-radius:14px;padding:18px 16px;text-align:center}
  .sv{font-family:'Space Mono',monospace;font-size:1.85rem;font-weight:700;color:${C.accent};line-height:1}
  .sl{font-size:0.63rem;color:${C.muted2};text-transform:uppercase;letter-spacing:0.1em;margin-top:5px}
  .hr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid ${C.border}}
  .hr:last-child{border-bottom:none}
  .hp{font-family:'Space Mono',monospace;font-size:0.7rem;color:${C.muted2};flex:0 0 58px}
  .hs{font-family:'Space Mono',monospace;font-size:0.78rem;font-weight:700;flex:0 0 36px}
  .hbw{flex:1;height:5px;background:${C.border};border-radius:3px;overflow:hidden}
  .hb{height:100%;border-radius:3px}
  .hd{font-family:'Space Mono',monospace;font-size:0.63rem;color:${C.muted};flex:0 0 62px;text-align:right}
  .div{height:1px;background:${C.border};margin:14px 0}
  .empty{text-align:center;color:${C.muted};padding:28px 0;font-size:0.84rem}
  .back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:${C.muted2};cursor:pointer;font-family:'Syne',sans-serif;font-size:0.8rem;padding:0;margin:14px 16px 0;transition:color 0.15s}
  .back:hover{color:${C.accent}}
  .chip{display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;background:${C.border};font-size:0.73rem;font-weight:600;color:${C.muted2}}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .ibox{background:${C.bg};border:1px solid ${C.border};border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .ic2{font-family:'Space Mono',monospace;font-size:1.45rem;letter-spacing:0.2em;color:${C.accent};font-weight:700}
  .merr{background:rgba(255,107,107,0.07);border:1px solid rgba(255,107,107,0.35);color:${C.red};padding:9px 13px;border-radius:8px;font-size:0.8rem;margin-top:10px}
  .msuc{background:rgba(106,255,142,0.07);border:1px solid rgba(106,255,142,0.28);color:${C.accent};padding:9px 13px;border-radius:8px;font-size:0.8rem;margin-top:10px}
  .trophybtn{background:linear-gradient(135deg,#1a1400,#0f0d00);border:1px solid rgba(255,215,0,0.28);color:${C.gold};border-radius:10px;padding:12px 20px;font-family:'Syne',sans-serif;font-weight:700;font-size:0.83rem;cursor:pointer;width:100%;transition:all 0.15s;margin-top:10px}
  .trophybtn:hover{border-color:${C.gold};opacity:0.88}
  .detected{border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between}
  .mono{font-family:'Space Mono',monospace}
  .spin{display:flex;justify-content:center;align-items:center;min-height:100vh;color:${C.muted};font-family:'Space Mono',monospace;font-size:0.8rem;letter-spacing:0.1em}
`;

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
const [tab, setTab] = useState(() => {
  return localStorage.getItem("wordle_last_tab") || "arenas";
});

// 2. Save tab whenever it changes
useEffect(() => {
  localStorage.setItem("wordle_last_tab", tab);
}, [tab]);
  const [session, setSession]       = useState(null);
  const [profile, setProfile]       = useState(null); // { id, username }
  const [myLogs, setMyLogs]         = useState([]);   // rows from `logs` table
  const [loading, setLoading]       = useState(true);
  const [arenaView, setArenaView]   = useState("list");
  const [currentArena, setCurrentArena] = useState(null);


const handleSignOut = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("wordle_last_tab"); // Reset to default for next login
  window.location.reload(); // Hard refresh to clear all states
};

useEffect(() => {
  // If we are in an arena and the user hits 'Back' on their phone
  const handlePhysicalBack = (e) => {
    if (tab === "arenas" && arenaView === "group") {
      e.preventDefault();
      setArenaView("list");
      setCurrentArena(null);
    }
  };

  window.addEventListener("popstate", handlePhysicalBack);
  
  // Push a fake state so there is something to "go back" from
  if (arenaView === "group") {
    window.history.pushState({ viewingArena: true }, "");
  }

  return () => window.removeEventListener("popstate", handlePhysicalBack);
}, [arenaView, tab]);


  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setMyLogs([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data || null);
    if (data) await loadMyLogs(userId);
    setLoading(false);
  };

  const loadMyLogs = async (userId) => {
    const { data } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", userId)
      .order("puzzle_no", { ascending: false });
    setMyLogs(data || []);
  };

  const todayPuzzle = getTodayWordleNumber();
  const todayLog    = myLogs.find(e => e.puzzle_no === todayPuzzle);
  const streak      = calculateStreak(myLogs);

  if (loading) return <><style>{css}</style><div className="spin">LOADING…</div></>;

  // ── Not logged in → Auth screen ──
  if (!session) {
    return <><style>{css}</style><AuthScreen /></>;
  }

  // ── Logged in but no profile → Username setup ──
  if (!profile) {
    return (
      <>
        <style>{css}</style>
        <UsernameSetup
          userId={session.user.id}
          onDone={(p) => { setProfile(p); loadMyLogs(p.id); }}
        />
      </>
    );
  }

  // ── Main app ──
  return (
    <>
      <style>{css}</style>
      <div className="app">
        {tab === "arenas" && arenaView === "list" && (
          <ArenasListView
            profile={profile}
            todayLog={todayLog}
            onSelect={id => { setCurrentArena(id); setArenaView("group"); }}
          />
        )}
        {tab === "arenas" && arenaView === "group" && currentArena && (
          <ArenaGroupView
            arenaId={currentArena}
            profile={profile}
            onBack={() => { setArenaView("list"); setCurrentArena(null); }}
          />
        )}
        {tab === "log" && (
          <LogView
            profile={profile}
            todayLog={todayLog}
            todayPuzzle={todayPuzzle}
            streak={streak}
            onSubmitted={() => loadMyLogs(profile.id)}
          />
        )}
        {tab === "history" && (
  <HistoryView 
    myLogs={myLogs} 
    streak={streak} 
    onSignOut={handleSignOut} 
  />
)}
      </div>

      <nav className="bnav">
  {[
    { 
      key: "arenas", 
      icon: <Sword size={20} />, 
      label: "ARENAS" 
    },
    { 
      key: "log", 
      icon: <ClipboardCheck size={20} color={todayLog ? C.accent : "currentColor"} />, 
      label: "THE LOG" 
    },
    { 
      key: "history", 
      icon: <History size={20} />, 
      label: "HISTORY" 
    },
  ].map(n => (
    <button 
      key={n.key} 
      className={`ni ${tab === n.key ? "on" : ""}`}
      onClick={() => {
        setTab(n.key);
        if (n.key === "arenas") { 
          setArenaView("list"); 
          setCurrentArena(null); 
        }
      }}
    >
      <span className="ic">{n.icon}</span>
      <span>{n.label}</span>
    </button>
  ))}
</nav>
    </>
  );
}

// ─────────────────────────────────────────────
// AUTH SCREEN  (email magic link)
// ─────────────────────────────────────────────

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // This ensures they go back to your site after logging in
        redirectTo: window.location.origin 
      }
    });
    if (error) setErr(error.message);
  };

  const loginWithEmail = async () => {
    if (!email.trim()) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"100vh",padding:"0 24px",maxWidth:520,margin:"0 auto" }}>
      <div style={{ textAlign:"center",marginBottom:32 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"3.2rem",fontWeight:800,letterSpacing:"-2px",lineHeight:1 }}>
          WORDLE<br/><span style={{ color:C.accent }}>SQUAD</span>
        </h1>
      </div>

      <div className="card" style={{ margin:0 }}>
        <button className="btn" onClick={loginWithGoogle} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <img src="https://www.google.com/favicon.ico" width="16" alt="G" />
          Continue with Google
        </button>

        <div style={{ display:'flex', alignItems:'center', margin:'10px 0 20px', gap:10, opacity:0.3 }}>
          <div style={{ flex:1, height:1, background:C.text }}></div>
          <span style={{ fontSize:10, fontFamily:'Space Mono' }}>OR</span>
          <div style={{ flex:1, height:1, background:C.text }}></div>
        </div>

        {sent ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ color:C.accent, fontSize:"0.82rem" }}>Check your email for the magic link!</div>
          </div>
        ) : (
          <>
            <input className="inp" style={{ marginBottom:12 }} type="email" placeholder="Email (Backup)..."
              value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn ghost" disabled={busy} onClick={loginWithEmail}>
              {busy ? "SENDING..." : "Email Magic Link"}
            </button>
          </>
        )}
        {err && <div className="merr">{err}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// USERNAME SETUP  (runs once after first login)
// ─────────────────────────────────────────────

function UsernameSetup({ userId, onDone }) {
  const [username, setUsername] = useState("");
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);

  const save = async () => {
    const name = username.trim();
    if (!name) return;
    setBusy(true); setErr("");
    const { data, error } = await supabase
      .from("profiles")
      .insert({ id: userId, username: name })
      .select()
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message.includes("unique") ? "That name is taken — try another." : error.message);
    } else {
      onDone(data);
    }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",justifyContent:"center",minHeight:"100vh",padding:"0 24px",maxWidth:520,margin:"0 auto" }}>
      <div style={{ textAlign:"center",marginBottom:32 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:"3.2rem",fontWeight:800,letterSpacing:"-2px",lineHeight:1 }}>
          WORDLE<br/><span style={{ color:C.accent }}>SQUAD</span>
        </h1>
      </div>
      <div className="card" style={{ margin:0 }}>
        <div className="ct">PICK YOUR NAME</div>
        <p style={{ color:C.muted2,fontSize:"0.8rem",marginBottom:14 }}>This is how your squad will see you on the leaderboard.</p>
        <input className="inp" style={{ marginBottom:12 }} placeholder="Username…"
          value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key==="Enter" && save()} />
        <button className="btn" disabled={busy || !username.trim()} onClick={save}>
          {busy ? "SAVING…" : "LET'S PLAY →"}
        </button>
        {err && <div className="merr">{err}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOG VIEW
// ─────────────────────────────────────────────

function LogView({ profile, todayLog, todayPuzzle, streak, onSubmitted }) {
  const [text, setText]     = useState("");
  const [parsed, setParsed] = useState(null);
  const [msg, setMsg]       = useState(null);
  const [busy, setBusy]     = useState(false);

  const handle = (v) => { setText(v); setParsed(parseWordle(v)); setMsg(null); };

  const submit = async () => {
    if (!parsed) { setMsg({ type:"error", text:"Couldn't detect a score — paste the Wordle share text." }); return; }
    if (parsed.puzzle !== todayPuzzle) {
      setMsg({ type:"error", text:`That's Wordle #${parsed.puzzle}, but today is #${todayPuzzle}. Only today's counts.` });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("logs").insert({
      user_id:   profile.id,
      puzzle_no: parsed.puzzle,
      score:     parsed.score,
      failed:    parsed.failed,
      date_str:  todayDateStr(),
    });
    setBusy(false);
    if (error) { setMsg({ type:"error", text: error.message }); return; }
    setText(""); setParsed(null);
    setMsg({ type:"success", text:"Locked in! Score synced to all your Arenas." });
    onSubmitted();
  };

  const wrongPuzzle = parsed && parsed.puzzle !== todayPuzzle;

  return (
    <div>
      <div className="ph">
        <h1>THE<br/><span style={{color:C.accent}}>LOG</span></h1>
        <p className="mono">WORDLE #{todayPuzzle}</p>
      </div>

      <div className="sbanner" style={{ opacity:streak===0?0.48:1 }}>
        <div className="snum">{streak>0?`🔥${streak}`:"💀0"}</div>
        <div className="slbl">
          <strong>{streak>0?"Day Streak":"No Streak"}</strong>
          <small>{streak===0?"Submit today to start one":streak===1?"Keep it alive tomorrow!":`${streak} consecutive puzzles`}</small>
        </div>
      </div>

      {todayLog ? (
        <>
          <div className="lbox">
            <div style={{fontSize:"2.2rem",marginBottom:8}}>🔒</div>
            <div className="lsc" style={{color:todayLog.failed?C.red:C.accent}}>
              {todayLog.failed?"X/6":`${todayLog.score}/6`}
            </div>
            <div className="lmt">WORDLE #{todayLog.puzzle_no} · SUBMITTED</div>
            <div style={{color:C.muted2,fontSize:"0.76rem",marginTop:10}}>Come back tomorrow for #{todayPuzzle+1}</div>
          </div>
          <div style={{margin:"0 16px"}}>
            <button className="trophybtn" onClick={() => generateTrophy(todayLog.score, streak, todayLog.puzzle_no, profile.username)}>
              🏆  Download Trophy PNG
            </button>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="ct">PASTE SHARE TEXT</div>
          <textarea className="inp" style={{marginBottom:12}}
            placeholder={"Wordle 1,713 3/6\n🟨⬛⬛⬛⬛\n⬛🟨🟨🟩🟩\n🟩🟩🟩🟩🟩"}
            value={text} onChange={e => handle(e.target.value)} />

          {parsed && (
            <div className="detected" style={{
              background: wrongPuzzle?"rgba(255,107,107,0.07)":C.accentDim,
              border:`1px solid ${wrongPuzzle?"rgba(255,107,107,0.35)":C.accent}`,
              marginBottom:12
            }}>
              <span className="mono" style={{fontSize:"0.7rem",color:C.muted2}}>DETECTED</span>
              <span className="mono" style={{fontWeight:700,fontSize:"1.1rem",color:wrongPuzzle?C.red:C.accent}}>
                {parsed.failed?"X":parsed.score}/6
                {wrongPuzzle&&<span style={{fontSize:"0.68rem",marginLeft:8}}>⚠ WRONG PUZZLE (#{parsed.puzzle})</span>}
              </span>
            </div>
          )}

          <button className="btn" disabled={!parsed || wrongPuzzle || busy} onClick={submit}>
            {busy ? "SUBMITTING…" : "SUBMIT TO ALL ARENAS →"}
          </button>
          {msg && <div className={msg.type==="error"?"merr":"msuc"}>{msg.text}</div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ARENAS LIST
// ─────────────────────────────────────────────

function ArenasListView({ profile, todayLog, onSelect }) {
  const [arenas, setArenas]         = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [loadingArenas, setLoadingArenas] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [groupName, setGroupName]   = useState("");
  const [joinCode, setJoinCode]     = useState("");
  const [joinErr, setJoinErr]       = useState("");
  const [busy, setBusy]             = useState(false);

  const load = useCallback(async () => {
    const { data: memberships } = await supabase
      .from("arena_members")
      .select("arena_id")
      .eq("user_id", profile.id);

    if (!memberships?.length) { setArenas([]); setLoadingArenas(false); return; }

    const ids = memberships.map(m => m.arena_id);
    const { data: arenaData } = await supabase
      .from("arenas")
      .select("*")
      .in("id", ids);

    // Member counts
    const counts = {};
    await Promise.all(ids.map(async id => {
      const { count } = await supabase
        .from("arena_members")
        .select("*", { count:"exact", head:true })
        .eq("arena_id", id);
      counts[id] = count || 0;
    }));

    setArenas(arenaData || []);
    setMemberCounts(counts);
    setLoadingArenas(false);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

const create = async () => {
  if (!groupName.trim()) return;
  setBusy(true);

  // 1. Create the Arena
  const { data: arena, error: arenaErr } = await supabase
    .from("arenas")
    .insert([{ name: groupName.trim(), created_by: profile.id }])
    .select()
    .single();

  if (arenaErr) {
    alert(arenaErr.message);
    setBusy(false);
    return;
  }

  // 2. IMMEDIATELY join the creator to the arena_members
  const { error: memberErr } = await supabase
    .from("arena_members")
    .insert([{ arena_id: arena.id, user_id: profile.id }]);

  if (memberErr) {
    console.error("Failed to join arena:", memberErr.message);
  }

  // 3. Reset UI and RELOAD
  setGroupName("");
  setShowCreate(false);
  await load(); // This re-fetches the list and member counts
  setBusy(false);
};

  const join = async () => {
    const id = joinCode.trim().toUpperCase();
    setJoinErr("");
    const { data: arena } = await supabase.from("arenas").select("id").eq("id", id).single();
    if (!arena) { setJoinErr("No arena found with that code."); return; }
    const { data: existing } = await supabase
      .from("arena_members")
      .select("arena_id")
      .eq("arena_id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (existing) { setJoinErr("You're already in this arena!"); return; }
    setBusy(true);
    await supabase.from("arena_members").insert({ arena_id: id, user_id: profile.id });
    setJoinCode(""); setShowJoin(false);
    load();
    setBusy(false);
  };

  return (
    <div>
      <div className="ph"><h1>ARENAS</h1><p>Your competition squads</p></div>

      <div style={{display:"flex",gap:8,margin:"0 16px 14px"}}>
        <button className="btn" style={{flex:1}} onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}>
          {showCreate?"Cancel":"+ Create"}
        </button>
        <button className="btn ghost" style={{flex:1}} onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}>
          {showJoin?"Cancel":"Join"}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <div className="ct">NEW ARENA</div>
          <input className="inp" style={{marginBottom:10}} placeholder="Arena name…" value={groupName}
            onChange={e => setGroupName(e.target.value)} onKeyDown={e => e.key==="Enter"&&create()} />
          <button className="btn" disabled={busy} onClick={create}>{busy?"Creating…":"Create →"}</button>
        </div>
      )}

      {showJoin && (
        <div className="card">
          <div className="ct">JOIN WITH CODE</div>
          <input className="inp mono" style={{marginBottom:10}} placeholder="e.g. AB12C" value={joinCode}
            onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(""); }}
            onKeyDown={e => e.key==="Enter"&&join()} />
          <button className="btn" disabled={busy} onClick={join}>{busy?"Joining…":"Join →"}</button>
          {joinErr && <div className="merr">{joinErr}</div>}
        </div>
      )}

      {!loadingArenas && !arenas.length && !showCreate && !showJoin && (
        <div className="empty">No arenas yet.<br/>Create one or join with a code.</div>
      )}

      {arenas.map(a => (
        <div key={a.id} className="acard" onClick={() => onSelect(a.id)}>
          <div>
            <div className="aname">{a.name}</div>
            <div className="ameta">{memberCounts[a.id] || 0} member{memberCounts[a.id]!==1?"s":""} · {a.id}</div>
          </div>
          <span className={`badge ${todayLog?"bg-g":"bg-y"}`}>
            {todayLog?"● LOCKED":"○ WAITING"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ARENA GROUP VIEW
// ─────────────────────────────────────────────

function medalFor(i) {
  if (i===0) return {emoji:"🥇",color:C.gold};
  if (i===1) return {emoji:"🥈",color:C.silver};
  if (i===2) return {emoji:"🥉",color:C.bronze};
  return {emoji:`#${i+1}`,color:C.muted2};
}

function ArenaGroupView({ arenaId, profile, onBack }) {
  const [sub, setSub]         = useState("leaderboard");
  const [arena, setArena]     = useState(null);
  const [members, setMembers] = useState([]);   // [{ user_id, username }]
  const [allLogs, setAllLogs] = useState([]);
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const load = async () => {
    setLoading(true);
    
    // 1. Fetch Arena Meta
    const { data: arenaData } = await supabase
      .from("arenas")
      .select("*")
      .eq("id", arenaId)
      .single();
    setArena(arenaData);

    // 2. Fetch Members AND their usernames
    // Note: the !inner tells Supabase to only return rows where a profile exists
    const { data: memberRows } = await supabase
      .from("arena_members")
      .select(`
        user_id,
        profiles!inner (
          username
        )
      `)
      .eq("arena_id", arenaId);

    const memberList = (memberRows || []).map(m => ({
      user_id: m.user_id,
      username: m.profiles?.username || "Unknown",
    }));
    setMembers(memberList);

    // 3. Fetch logs for those members
    if (memberList.length > 0) {
      const { data: logs } = await supabase
        .from("logs")
        .select("*")
        .in("user_id", memberList.map(m => m.user_id));
      setAllLogs(logs || []);
    }
    
    setLoading(false);
  };
  load();
}, [arenaId]);


  const copy = () => navigator.clipboard?.writeText(arenaId).then(() => {
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  });

  if (loading || !arena) return (
    <div>
      <button className="back" onClick={onBack}>← All Arenas</button>
      <div className="spin">LOADING…</div>
    </div>
  );

  const todayPuzzle = getTodayWordleNumber();
  const todayLogs   = allLogs.filter(l => l.puzzle_no === todayPuzzle);
  const submitted   = new Set(todayLogs.map(l => l.user_id));
  const pending     = members.filter(m => !submitted.has(m.user_id));

  const lbStats = members.map(m => {
    const logs = allLogs.filter(l => l.user_id === m.user_id);
    const wins = logs.filter(l => !l.failed);
    const avg  = wins.length ? (wins.reduce((a,b) => a+b.score, 0) / wins.length).toFixed(2) : null;
    return { ...m, avg, streak: calculateStreak(logs), total: logs.length };
  }).sort((a,b) => (!a.avg&&!b.avg?0:!a.avg?1:!b.avg?-1:parseFloat(a.avg)-parseFloat(b.avg)));

  const usernameMap = Object.fromEntries(members.map(m => [m.user_id, m.username]));

  return (
    <div>
      <button className="back" onClick={onBack}>← All Arenas</button>
      <div className="ph" style={{paddingTop:10}}>
        <h1 style={{fontSize:"1.55rem"}}>{arena.name}</h1>
        <p>{members.length} members</p>
      </div>

      <div style={{margin:"0 16px 4px"}}>
        <div className="stabs">
          {["leaderboard","today","invite"].map(t => (
            <button key={t} className={`st ${sub===t?"on":""}`} onClick={() => setSub(t)}>
              {t==="leaderboard"?"Leaderboard":t==="today"?"Today":"Invite"}
            </button>
          ))}
        </div>
      </div>

      {sub==="leaderboard" && (
        <div className="card">
          <div className="ct">ALL-TIME RANKINGS</div>
          {!lbStats.length ? <div className="empty">No scores yet!</div> : lbStats.map((s,i) => {
            const m = medalFor(i);
            return (
              <div key={s.user_id} className="lbr">
                <div style={{width:26,textAlign:"center",color:m.color,fontSize:"1rem"}}>{m.emoji}</div>
                <div style={{flex:1,fontWeight:600,fontSize:"0.88rem"}}>
                  {s.username}
                  {s.user_id===profile.id&&<span style={{fontSize:"0.68rem",color:C.muted,marginLeft:6}}>you</span>}
                </div>
                {s.streak>0&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.7rem",color:C.orange}}>🔥{s.streak}</span>}
                <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:"0.86rem",color:C.accent}}>
                  {s.avg?`avg ${s.avg}`:"—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sub==="today" && (
        <div className="card">
          <div className="ct">TODAY'S STANDINGS</div>
          {!todayLogs.length
            ? <div className="empty" style={{paddingTop:14}}>Nobody has scored yet today.</div>
            : [...todayLogs].sort((a,b)=>a.score-b.score).map((l,i) => (
                <div key={l.user_id} className="tdr">
                  <div style={{width:26,color:medalFor(i).color,fontSize:"1rem",textAlign:"center"}}>{medalFor(i).emoji}</div>
                  <div style={{flex:1,fontWeight:600,fontSize:"0.88rem"}}>
                    {usernameMap[l.user_id]||"?"}
                    {l.user_id===profile.id&&<span style={{fontSize:"0.68rem",color:C.muted,marginLeft:6}}>you</span>}
                  </div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,color:l.failed?C.red:C.accent}}>
                    {l.failed?"X/6":`${l.score}/6`}
                  </div>
                </div>
              ))
          }
          {pending.length>0&&(
            <>
              <div className="div"/>
              <div style={{fontSize:"0.66rem",color:C.muted2,letterSpacing:"0.1em",marginBottom:8,fontFamily:"'Space Mono',monospace"}}>PENDING</div>
              <div className="chips">{pending.map(m=><span key={m.user_id} className="chip">{m.username}</span>)}</div>
            </>
          )}
        </div>
      )}

      {sub==="invite" && (
        <div className="card">
          <div className="ct">INVITE CODE</div>
          <p style={{color:C.muted2,fontSize:"0.8rem",marginBottom:14}}>Share this code so teammates can join.</p>
          <div className="ibox">
            <span className="ic2">{arenaId}</span>
            <button className="btn bsm" style={{width:"auto"}} onClick={copy}>{copied?"Copied!":"Copy"}</button>
          </div>
          <div className="div"/>
          <div className="ct">MEMBERS ({members.length})</div>
          <div className="chips">{members.map(m=><span key={m.user_id} className="chip">{m.username}</span>)}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HISTORY VIEW
// ─────────────────────────────────────────────

function HistoryView({ myLogs, streak, onSignOut }) {
  const sorted  = [...myLogs].sort((a, b) => b.puzzle_no - a.puzzle_no);
  const wins    = myLogs.filter(e => !e.failed);
  const winRate = myLogs.length ? Math.round((wins.length / myLogs.length) * 100) : null;
  const avg     = wins.length ? (wins.reduce((a, b) => a + b.score, 0) / wins.length).toFixed(2) : null;
  const best    = wins.length ? Math.min(...wins.map(e => e.score)) : null;

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>HISTORY</h1>
          <p>{myLogs.length} games played</p>
        </div>
        {/* Sign Out Icon Button */}
        <button onClick={onSignOut} className="btn ghost bsm" style={{ width: 'auto', borderColor: C.border }}>
          <LogOut size={16} color={C.red} />
        </button>
      </div>

      <div className="sgrid">
        <div className="scard">
          <div className="sv" style={{ color: C.orange }}>{streak > 0 ? `🔥${streak}` : "0"}</div>
          <div className="sl">Current Streak</div>
        </div>
        <div className="scard">
          <div className="sv">{winRate !== null ? `${winRate}%` : "—"}</div>
          <div className="sl">Win Rate</div>
        </div>
        <div className="scard">
          <div className="sv">{avg ?? "—"}</div>
          <div className="sl">Avg Score</div>
        </div>
        <div className="scard">
          <div className="sv">{best ? `${best}/6` : "—"}</div>
          <div className="sl">Personal Best</div>
        </div>
      </div>

      <div className="card">
        <div className="ct">GAME LOG</div>
        {!sorted.length ? (
          <div className="empty">No games yet — submit today's Wordle!</div>
        ) : (
          sorted.map((e, i) => {
            const barPct = e.failed ? 100 : Math.round((e.score / 6) * 100);
            const barColor = e.failed ? C.red : e.score <= 3 ? C.accent : C.yellow;
            const date = new Date(e.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            
            return (
              <div key={i} className="hr">
                <span className="hp">#{e.puzzle_no}</span>
                <span className="hs" style={{ color: e.failed ? C.red : C.accent }}>
                  {e.failed ? "X/6" : `${e.score}/6`}
                </span>
                <div className="hbw">
                  <div className="hb" style={{ width: `${barPct}%`, background: barColor }} />
                </div>
                <span className="hd">{date}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Large Sign Out Button at Bottom for accessibility */}
      <div style={{ padding: "0 16px 40px" }}>
        <button className="btn ghost" style={{ color: C.red, borderColor: C.border }} onClick={onSignOut}>
          Log Out
        </button>
      </div>
    </div>
  );
}