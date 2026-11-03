// What a member or child sees when the role-play caller rings: an incoming-call screen, then an on-call bar
// with live captions of what the caller "says" and any payment details they send.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, MessageSquare, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { useDb, answerCall, endCall } from '../core/store.js';
import { useClock } from './caller/Caller.jsx';
import { inr } from '../ui.jsx';
import { speak as say, prime, stopSpeaking } from '../core/speech.js';

export default function CallLayer({ user }) {
  const db = useDb();
  const nav = useNavigate();
  const call = (db.calls || []).find((c) => c.toUserId === user.id && ['ringing', 'active'].includes(c.status));
  const [open, setOpen] = useState(false);
  const [speak, setSpeak] = useState(true);
  const [seenMsg, setSeenMsg] = useState(0);
  const spoken = useRef(0);
  const time = useClock(call?.answeredAt);

  useEffect(() => {
    if (call?.status === 'ringing') { try { navigator.vibrate?.([400, 200, 400, 200, 400]); } catch { /* ignore */ } }
  }, [call?.status, call?.id]);
  useEffect(() => { spoken.current = call?.transcript?.length || 0; setSeenMsg(0); }, [call?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!call || call.status !== 'active') return;
    const n = call.transcript.length;
    if (n > spoken.current) {
      const line = call.transcript[n - 1].text;
      spoken.current = n;
      if (speak) say(line, { rate: 1, pitch: 0.8 });
    }
  }, [call?.transcript?.length, call?.status, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!call) return null;

  if (call.status === 'ringing') {
    return (
      <div className="incoming" role="dialog" aria-label="Incoming call">
        <div className="who">
          <span className="eyebrow" style={{ color: '#c9d6ee' }}>Incoming call{call.lateNight ? ' · 11:40 pm' : ''}</span>
          <span className="ring-dot big"><Phone size={40} /></span>
          <b>{call.callerId}</b>
          <small>Unknown number · Mobile</small>
        </div>
        <div className="answer-row">
          <button className="callbtn decline" onClick={() => endCall(call.id, 'victim')} aria-label="Decline"><PhoneOff size={28} /></button>
          <button className="callbtn accept" onClick={() => { prime(); answerCall(call.id); }} aria-label="Accept"><Phone size={28} /></button>
        </div>
        <small className="sim-note">Simulated call for the role-play. No real call is made.</small>
      </div>
    );
  }

  const last = call.transcript[call.transcript.length - 1];
  const msg = call.messages[call.messages.length - 1];
  const newMsg = call.messages.length > seenMsg ? msg : null;
  const openPayment = () => {
    setSeenMsg(call.messages.length);
    nav(user.role === 'child' ? '/app/pay' : '/app/pay', { state: { upi: msg.upi, amount: msg.amount, note: msg.note, from: 'call' } });
  };
  return (
    <div className="oncall">
      <div className="oncall-bar">
        <span className="live-dot" /><b className="grow">On call · {call.callerId}</b><span className="mono">{time}</span>
        <button className="iconbtn sm" onClick={() => { if (speak) stopSpeaking(); else { prime(); if (last) say(last.text, { pitch: 0.8 }); } setSpeak(!speak); }} aria-label={speak ? 'Mute caller voice' : 'Read caller lines aloud'}>{speak ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
        <button className="iconbtn sm" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse' : 'Expand'}>{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
        <button className="iconbtn sm hang" onClick={() => { stopSpeaking(); endCall(call.id, 'victim'); }} aria-label="Hang up"><PhoneOff size={15} /></button>
      </div>
      {last && <p className="caption">“{last.text}”</p>}
      {open && call.transcript.length > 1 && (
        <div className="transcript">{call.transcript.slice(0, -1).reverse().map((l, i) => <p key={i}>“{l.text}”</p>)}</div>
      )}
      {newMsg && (
        <div className="sms">
          <MessageSquare size={16} style={{ flex: 'none', marginTop: 2 }} />
          <div className="grow"><small className="muted">Message · {newMsg.from}</small><div>{newMsg.text}</div></div>
          <button className="btn xs" onClick={openPayment}>Pay {inr(newMsg.amount)}</button>
        </div>
      )}
    </div>
  );
}
