import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Camera,
  QrCode,
  Shield,
  Clock,
  ArrowRight,
  ChevronRight,
  Info,
  X,
  RefreshCw,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';

// Simulated default mock accounts
const MOCK_STUDENT = { id: 10, email: 'student.active@campus.edu' };
const MOCK_ADMIN = { id: 99, email: 'dean.adviser@campus.edu' };
const MOCK_ORGANIZERS = [
  { id: 1, email: 'org.a@campus.edu', name: 'TECH CLUB' },
  { id: 2, email: 'org.b@campus.edu', name: 'SPORTS ASSOC' },
  { id: 3, email: 'org.c@campus.edu', name: 'ACADEMIC UNION' },
  { id: 4, email: 'org.d@campus.edu', name: 'ARTS SOCIETY' },
];

export default function App() {
  const [persona, setPersona] = useState('STUDENT'); // STUDENT, ORGANIZER, ADMIN
  const [activeOrg, setActiveOrg] = useState(MOCK_ORGANIZERS[0]); // Active simulated organizer
  
  // Refresh toggles
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* 1. Global Role Switcher Fixed Header */}
      <header className="backdrop-blur-md bg-zinc-950/70 border-b border-zinc-800/80 sticky top-0 z-50 py-3 px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-brand-gradient leading-none">CAMPUS HUB</h1>
            <span className="text-[10px] tracking-wider text-zinc-500 font-medium">CONFLICT-PREVENTION SYSTEM</span>
          </div>
        </div>

        {/* Persona Selector Buttons */}
        <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 gap-1">
          <button
            onClick={() => setPersona('STUDENT')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 ${
              persona === 'STUDENT'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            General Student
          </button>
          <button
            onClick={() => setPersona('ORGANIZER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 ${
              persona === 'ORGANIZER'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Org Leader
          </button>
          <button
            onClick={() => setPersona('ADMIN')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 ${
              persona === 'ADMIN'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Approver
          </button>
        </div>

        {/* Identity Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Simulated Identity</span>
            <span className="text-xs text-indigo-400 font-semibold font-mono">
              {persona === 'STUDENT' && MOCK_STUDENT.email}
              {persona === 'ORGANIZER' && `${activeOrg.name} (${activeOrg.email})`}
              {persona === 'ADMIN' && MOCK_ADMIN.email}
            </span>
          </div>
          <div className="h-7 w-[1px] bg-zinc-800 hidden lg:block" />
          <button
            onClick={triggerRefresh}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white"
            title="Refresh Feed / Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-6">
        {persona === 'STUDENT' && (
          <StudentFeedView
            student={MOCK_STUDENT}
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        )}
        
        {persona === 'ORGANIZER' && (
          <OrganizerDashboardView
            org={activeOrg}
            organizers={MOCK_ORGANIZERS}
            setActiveOrg={setActiveOrg}
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        )}

        {persona === 'ADMIN' && (
          <AdminDashboardView
            admin={MOCK_ADMIN}
            refreshTrigger={refreshTrigger}
            triggerRefresh={triggerRefresh}
          />
        )}
      </main>
    </div>
  );
}

/* ============================================================================
 * 3.2. STUDENT FEED VIEW (Mobile-Responsive Discovery Feed)
 * ============================================================================ */
function StudentFeedView({ student, refreshTrigger, triggerRefresh }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState({}); // eventId -> qrSignature
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Default discovery interest tags
  const tagsList = ['All', 'tech', 'academic', 'social', 'sports', 'music', 'education', 'party'];

  // Fetch approved discovery events from MongoDB
  useEffect(() => {
    const fetchApprovedEvents = async () => {
      setLoading(true);
      try {
        let url = '/api/events';
        if (selectedTag !== 'All') {
          url += `?tag=${selectedTag}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error('Error fetching discovery events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovedEvents();
  }, [selectedTag, refreshTrigger]);

  const handleOpenRSVPModal = (event) => {
    setSelectedEvent(event);
    setShowRsvpModal(true);
    setErrorMessage('');
  };

  const handleRSVPSubmit = async (eventId) => {
    setRsvpLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: student.id }),
      });
      const data = await res.json();
      
      if (res.status === 201 || res.status === 409) {
        // Success or already RSVP'd
        setRsvpStatus(prev => ({
          ...prev,
          [eventId]: data.qrSignature,
        }));
        triggerRefresh(); // Refresh rsvp count in card
      } else {
        setErrorMessage(data.message || 'Failed to submit RSVP');
      }
    } catch (err) {
      setErrorMessage('Network error occurred. Please try again.');
      console.error(err);
    } finally {
      setRsvpLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      {/* Sleek mobile device frame wrapper */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] min-h-[820px] shadow-2xl relative flex flex-col mobile-device-frame overflow-hidden">
        {/* Mobile Device Status Bar */}
        <div className="h-10 bg-zinc-950 flex justify-between items-center px-8 border-b border-zinc-900">
          <span className="text-xs font-mono font-bold text-zinc-400">14:52</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider font-mono">5G Connected</span>
          </div>
        </div>

        {/* Student App Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 pb-20 relative">
          
          {/* Student Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 p-[2px] shadow-lg shadow-indigo-500/10">
                <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-indigo-400" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Hi, Discoverer</h3>
                <p className="text-[11px] text-zinc-500 font-medium font-mono truncate max-w-[200px]">{student.email}</p>
              </div>
            </div>
            
            {/* Active RSVPs Badge */}
            <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              <QrCode className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 font-mono">
                {Object.keys(rsvpStatus).length} ACTIVE
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Discover <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Campus Events</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">Real-time scheduling and secure check-ins.</p>
          </div>

          {/* TagScroller: horizontal scrolling interest tag pills */}
          <div className="flex overflow-x-auto gap-2 pb-3 mb-5 -mx-5 px-5 scrollbar-thin">
            {tagsList.map(tag => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {tag === 'All' ? '⚡ All Interests' : `#${tag}`}
                </button>
              );
            })}
          </div>

          {/* EventCardGrid Container */}
          <div className="flex-1 flex flex-col gap-4">
            {loading ? (
              // Shimmer Placeholder Skeletons
              [1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
                  <div className="h-32 bg-zinc-800 rounded-xl" />
                  <div className="h-4 bg-zinc-800 rounded w-2/3" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              ))
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-850 border border-zinc-800 flex items-center justify-center mb-3">
                  <Info className="h-6 w-6 text-zinc-500" />
                </div>
                <h4 className="text-sm font-bold text-zinc-300">No Approved Events Found</h4>
                <p className="text-xs text-zinc-500 max-w-[200px] mt-1">
                  There are no scheduled events matching #{selectedTag} at the moment.
                </p>
              </div>
            ) : (
              events.map(event => {
                const isRegistered = !!rsvpStatus[event.mysql_event_id];
                return (
                  <div
                    key={event.mysql_event_id}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5 flex flex-col"
                  >
                    {/* Media Banner with premium gradient */}
                    <div className="h-32 bg-gradient-to-br from-indigo-950 via-zinc-900 to-purple-950 relative flex items-center justify-center p-4">
                      {/* Tag Overlays */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                        {event.tags.map(t => (
                          <span key={t} className="text-[9px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md backdrop-blur-sm">
                            {t}
                          </span>
                        ))}
                      </div>
                      
                      {/* Brand Label */}
                      <span className="font-display font-black text-xl text-zinc-800 group-hover:text-indigo-900/30 tracking-widest uppercase select-none transition-colors duration-300">
                        {event.organizer_name}
                      </span>
                    </div>

                    {/* Event details */}
                    <div className="p-4 flex flex-col gap-3.5">
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors duration-200">
                          {event.title}
                        </h4>
                        <div className="flex flex-col gap-1 mt-2 text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{event.venue.name} (Capacity: {event.venue.capacity})</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>
                              {new Date(event.schedule.start_time).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RSVP Trigger Button */}
                      <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                          <Users className="h-3 w-3" /> {event.rsvps_count || 0} RSVPs
                        </span>
                        
                        <button
                          onClick={() => handleOpenRSVPModal(event)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                            isRegistered
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                          }`}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              RSVP Saved
                            </>
                          ) : (
                            <>
                              View Event
                              <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Slide-Up RSVP glassmorphism panel */}
        {showRsvpModal && selectedEvent && (
          <div className="absolute inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm flex flex-col justify-end transition-all duration-300">
            {/* Modal dismiss click area */}
            <div className="flex-1" onClick={() => setShowRsvpModal(false)} />
            
            {/* Modal Body */}
            <div className="backdrop-glass max-h-[85%] rounded-t-[2rem] p-5 flex flex-col gap-4 shadow-2xl relative animate-slide-up border-t border-zinc-700/50 bg-zinc-900/95">
              <button
                onClick={() => setShowRsvpModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700/50"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase font-mono">
                  EVENT METADATA SUMMARY
                </span>
                <h3 className="text-base font-extrabold tracking-tight text-white mt-1 leading-snug">
                  {selectedEvent.title}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">
                  HOSTED BY {selectedEvent.organizer_name}
                </p>
              </div>

              {/* Dynamic details */}
              <div className="bg-zinc-950/60 rounded-xl p-3.5 border border-zinc-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500 font-medium">Location Venue:</span>
                  <span className="font-bold text-zinc-300">{selectedEvent.venue.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500 font-medium">Time window:</span>
                  <span className="font-mono text-zinc-300 text-[11px] font-medium">
                    {new Date(selectedEvent.schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Venue Capacity Limit:</span>
                  <span className="font-bold text-zinc-300">{selectedEvent.venue.capacity} attendees</span>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 tracking-wider font-mono">ABOUT</span>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed max-h-[80px] overflow-y-auto pr-1">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* RSVP Action/QR display */}
              <div className="mt-2 border-t border-zinc-800 pt-4 flex flex-col gap-3">
                {rsvpStatus[selectedEvent.mysql_event_id] ? (
                  // Secure QR Generation widget
                  <div className="flex flex-col items-center gap-3 py-1 animate-fade-in">
                    <div className="p-3 bg-white rounded-xl shadow-lg flex items-center justify-center relative">
                      {/* Premium simulated QR Code matrix in pure SVG */}
                      <svg className="h-32 w-32 text-zinc-950" viewBox="0 0 100 100" fill="currentColor">
                        <rect x="0" y="0" width="25" height="25" />
                        <rect x="5" y="5" width="15" height="15" fill="white" />
                        <rect x="10" y="10" width="5" height="5" />
                        
                        <rect x="75" y="0" width="25" height="25" />
                        <rect x="80" y="5" width="15" height="15" fill="white" />
                        <rect x="85" y="10" width="5" height="5" />

                        <rect x="0" y="75" width="25" height="25" />
                        <rect x="5" y="80" width="15" height="15" fill="white" />
                        <rect x="10" y="85" width="5" height="5" />

                        {/* Dummy random QR noise blocks representing the state signature */}
                        <rect x="35" y="10" width="10" height="5" />
                        <rect x="50" y="5" width="5" height="15" />
                        <rect x="40" y="30" width="15" height="10" />
                        <rect x="10" y="35" width="15" height="5" />
                        <rect x="30" y="50" width="20" height="10" />
                        <rect x="60" y="45" width="10" height="20" />
                        <rect x="70" y="70" width="15" height="15" />
                        <rect x="35" y="75" width="5" height="20" />
                        <rect x="55" y="80" width="25" height="5" />
                      </svg>
                      {/* Pulsing indicator */}
                      <span className="absolute bottom-2 right-2 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wide uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Entry QR Pass Issued
                      </span>
                      <p className="text-[9px] text-zinc-500 font-mono mt-2 select-all bg-zinc-950/60 px-3 py-1 rounded border border-zinc-800 max-w-[250px] truncate">
                        Signature: {rsvpStatus[selectedEvent.mysql_event_id]}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-medium mt-1">
                        Show this signature/QR at the door for entry check-in.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Submit RSVP button
                  <div className="flex flex-col gap-3">
                    {errorMessage && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        {errorMessage}
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleRSVPSubmit(selectedEvent.mysql_event_id)}
                      disabled={rsvpLoading}
                      className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {rsvpLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Registering entry window...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-white" />
                          Confirm RSVP & Issue QR Code
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-zinc-500 font-medium text-center">
                      RSVP holds your slot relational capacity window and is instantly synchronized.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 3.3. ORGANIZER DASHBOARD VIEW (Student Leaders)
 * ============================================================================ */
function OrganizerDashboardView({ org, organizers, setActiveOrg, refreshTrigger, triggerRefresh }) {
  const [tab, setTab] = useState('SUBMIT'); // SUBMIT, STATS, SCANNER
  const [proposals, setProposals] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    approved: 0,
    pending: 0,
    needsReview: 0,
    totalRsvps: 0,
  });

  // Load org proposals and venues from backend
  useEffect(() => {
    const fetchOrgData = async () => {
      setLoading(true);
      try {
        // Fetch proposals
        const propRes = await fetch(`/api/events/proposals?organizationId=${org.id}`);
        const propData = await propRes.json();
        
        if (propData.success) {
          setProposals(propData.proposals);
          
          // Calculate stats
          const approved = propData.proposals.filter(p => p.status === 'APPROVED').length;
          const pending = propData.proposals.filter(p => p.status === 'PENDING').length;
          const needsReview = propData.proposals.filter(p => p.status === 'NEEDS_REVIEW').length;
          const totalRsvps = propData.proposals.reduce((sum, p) => sum + (p.rsvpsCount || 0), 0);

          setStats({ approved, pending, needsReview, totalRsvps });
        }

        // Fetch Venues
        const venueRes = await fetch('/api/events/venues');
        const venueData = await venueRes.json();
        if (venueData.success) {
          setVenues(venueData.venues);
        }
      } catch (err) {
        console.error('Error fetching org dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgData();
  }, [org, refreshTrigger]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Sidebar: OrgSidebar */}
      <div className="backdrop-glass rounded-2xl p-5 border border-zinc-800/80 bg-zinc-900/60 flex flex-col gap-5 lg:col-span-1">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 tracking-widest font-mono uppercase">
            ORGANIZER DESKTOP CONSOLE
          </span>
          <h2 className="text-xl font-black font-display text-white mt-1 uppercase tracking-tight">
            {org.name}
          </h2>
          <span className="text-[11px] text-zinc-500 font-mono truncate block mt-0.5">{org.email}</span>
        </div>

        {/* Change simulated active organization */}
        <div className="border-t border-zinc-800/80 pt-3">
          <label className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider block mb-2">
            Switch Organization Context
          </label>
          <div className="flex flex-col gap-1">
            {organizers.map(o => (
              <button
                key={o.id}
                onClick={() => {
                  setActiveOrg(o);
                  triggerRefresh();
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                  org.id === o.id
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                    : 'bg-transparent border border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <span>{o.name}</span>
                {org.id === o.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab selection menu links */}
        <div className="flex flex-col gap-1 border-t border-zinc-800/80 pt-3">
          <button
            onClick={() => setTab('SUBMIT')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
              tab === 'SUBMIT'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
            }`}
          >
            <Plus className="h-4 w-4" />
            Draft Event Proposal
          </button>
          <button
            onClick={() => setTab('STATS')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
              tab === 'STATS'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Status Queue & Stats ({proposals.length})
          </button>
          <button
            onClick={() => setTab('SCANNER')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
              tab === 'SCANNER'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
            }`}
          >
            <Camera className="h-4 w-4" />
            Guest Entry Scanner
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Overview Stats Cards with glassmorphism */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="backdrop-glass rounded-xl p-4 border border-zinc-800 bg-zinc-900/40 hover:-translate-y-1 transition-all duration-300 shadow-md">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider font-mono block">TOTAL RSVPS</span>
            <h3 className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">{stats.totalRsvps}</h3>
          </div>
          <div className="backdrop-glass rounded-xl p-4 border border-zinc-800 bg-zinc-900/40 hover:-translate-y-1 transition-all duration-300 shadow-md">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider font-mono block">APPROVED</span>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">{stats.approved}</h3>
          </div>
          <div className="backdrop-glass rounded-xl p-4 border border-zinc-800 bg-zinc-900/40 hover:-translate-y-1 transition-all duration-300 shadow-md">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider font-mono block">PENDING REVIEW</span>
            <h3 className="text-xl font-extrabold text-blue-400 mt-1 font-mono">{stats.pending}</h3>
          </div>
          <div className="backdrop-glass rounded-xl p-4 border border-zinc-800 bg-zinc-900/40 hover:-translate-y-1 transition-all duration-300 shadow-md">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider font-mono block">FLAGGED WARNINGS</span>
            <h3 className="text-xl font-extrabold text-amber-500 mt-1 font-mono">{stats.needsReview}</h3>
          </div>
        </div>

        {tab === 'SUBMIT' && (
          <EventProposalFormView
            org={org}
            venues={venues}
            triggerRefresh={triggerRefresh}
          />
        )}

        {tab === 'STATS' && (
          <div className="backdrop-glass rounded-2xl p-6 border border-zinc-800/80 bg-zinc-900/40 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Proposal Status Queue</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Relational state transitions for active organization schedules.</p>
            </div>
            
            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500 font-mono">Querying database nodes...</div>
            ) : proposals.length === 0 ? (
              <div className="py-12 border border-zinc-800/60 border-dashed rounded-xl flex flex-col items-center justify-center">
                <FileText className="h-8 w-8 text-zinc-600 mb-2" />
                <span className="text-xs font-bold text-zinc-400">No proposals drafted</span>
                <button
                  onClick={() => setTab('SUBMIT')}
                  className="mt-3 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-all"
                >
                  Create First Proposal
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase font-mono tracking-wider">
                      <th className="pb-3 pr-4">Event details</th>
                      <th className="pb-3 px-4">Venue & Capacity</th>
                      <th className="pb-3 px-4">Relational Time slot</th>
                      <th className="pb-3 px-4 text-center">Status</th>
                      <th className="pb-3 pl-4">Audit log / Feedbacks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {proposals.map(prop => (
                      <tr key={prop.id} className="hover:bg-zinc-850/30 transition-colors">
                        {/* Event Details */}
                        <td className="py-3.5 pr-4">
                          <span className="font-bold text-white tracking-tight text-sm block">{prop.title}</span>
                          <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                            Tags: {prop.tags.join(', ')}
                          </span>
                        </td>
                        {/* Venue */}
                        <td className="py-3.5 px-4 font-medium text-zinc-300">
                          <span>{prop.venueName}</span>
                          <span className="text-[10px] text-zinc-500 block font-mono">Limit: {prop.venueCapacity} seats</span>
                        </td>
                        {/* Timeslot */}
                        <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                          <span>
                            {new Date(prop.startTime).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="block text-[10px] text-zinc-600 mt-0.5">
                            to {new Date(prop.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        {/* Status badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider border ${
                            prop.status === 'APPROVED' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          } ${
                            prop.status === 'PENDING' && 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          } ${
                            prop.status === 'NEEDS_REVIEW' && 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          } ${
                            prop.status === 'REJECTED' && 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {prop.status}
                          </span>
                        </td>
                        {/* Admin Action Feedbacks */}
                        <td className="py-3.5 pl-4 text-zinc-500 italic max-w-[200px] truncate" title={prop.description}>
                          {prop.status === 'APPROVED' && (
                            <span className="text-emerald-500/70 text-[11px] font-medium block not-italic">
                              ✓ Live on Student Feed ({prop.rsvpsCount} RSVPs)
                            </span>
                          )}
                          {prop.status === 'REJECTED' && (
                            <span className="text-rose-500/70 text-[11px] font-medium block not-italic">
                              Resubmit with Reschedule
                            </span>
                          )}
                          {prop.status === 'NEEDS_REVIEW' && (
                            <span className="text-amber-500/70 text-[11px] font-medium block not-italic">
                              ⚠ Double-booking checks flag warnings
                            </span>
                          )}
                          {prop.status === 'PENDING' && (
                            <span className="text-zinc-500 text-[11px]">
                              Waiting on Faculty review queue...
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'SCANNER' && <GuestAttendanceScannerView />}
      </div>
    </div>
  );
}

/* ============================================================================
 * EventProposalForm Component (includes real-time ConflictPredictor)
 * ============================================================================ */
function EventProposalFormView({ org, venues, triggerRefresh }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venueId: '',
    startTime: '',
    endTime: '',
    tagsString: '',
  });

  const [conflictReport, setConflictReport] = useState({
    checked: false,
    loading: false,
    hasHardConflict: false,
    warnings: [],
  });

  const [submitState, setSubmitState] = useState({
    loading: false,
    success: false,
    error: '',
    warnings: [],
  });

  // Handle inputs and invoke real-time pre-flight conflict predictor
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Perform pre-flight Dry-Run Conflict Check (debounced/triggered as inputs are populated)
  useEffect(() => {
    const { venueId, startTime, endTime } = formData;
    if (!venueId || !startTime || !endTime) {
      setConflictReport({ checked: false, loading: false, hasHardConflict: false, warnings: [] });
      return;
    }

    const runPreflightConflictCheck = async () => {
      setConflictReport(prev => ({ ...prev, loading: true }));
      try {
        const parsedTags = formData.tagsString
          ? formData.tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
          : [];

        const res = await fetch('/api/events/check-conflicts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: org.id,
            venueId: parseInt(venueId, 10),
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            metadata: {
              tags: parsedTags,
            },
          }),
        });
        const data = await res.json();
        
        if (data.success) {
          setConflictReport({
            checked: true,
            loading: false,
            hasHardConflict: data.hasHardConflict,
            warnings: data.warnings || [],
          });
        }
      } catch (err) {
        console.error('Error pre-flight conflict dry-run check:', err);
        setConflictReport(prev => ({ ...prev, loading: false }));
      }
    };

    const timer = setTimeout(runPreflightConflictCheck, 600);
    return () => clearTimeout(timer);
  }, [formData.venueId, formData.startTime, formData.endTime, formData.tagsString, org.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, venueId, startTime, endTime } = formData;
    
    if (!title || !venueId || !startTime || !endTime) {
      setSubmitState({ loading: false, success: false, error: 'All fields are strictly required.', warnings: [] });
      return;
    }

    setSubmitState({ loading: true, success: false, error: '', warnings: [] });
    try {
      const parsedTags = formData.tagsString
        ? formData.tagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: org.id,
          venueId: parseInt(venueId, 10),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          metadata: {
            title,
            description,
            tags: parsedTags,
          },
        }),
      });

      const data = await res.json();

      if (res.status === 201) {
        setSubmitState({
          loading: false,
          success: true,
          error: '',
          warnings: data.warnings || [],
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          venueId: '',
          startTime: '',
          endTime: '',
          tagsString: '',
        });
        setConflictReport({ checked: false, loading: false, hasHardConflict: false, warnings: [] });
        
        // Refresh schedules
        triggerRefresh();
      } else {
        setSubmitState({
          loading: false,
          success: false,
          error: data.message || 'Verification engine rejected proposal scheduling.',
          warnings: [],
        });
      }
    } catch (err) {
      setSubmitState({
        loading: false,
        success: false,
        error: 'Network connectivity error. Verification failed.',
        warnings: [],
      });
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      
      {/* Submit proposal form: EventProposalForm */}
      <div className="lg:col-span-3 backdrop-glass rounded-2xl p-6 border border-zinc-800 bg-zinc-900/40 shadow-xl flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Draft Event Proposal</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Run instantaneous verification engine before committing changes.</p>
        </div>

        {submitState.success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle className="h-4.5 w-4.5" />
              Event proposal successfully saved in relational ledger!
            </div>
            {submitState.warnings.length > 0 ? (
              <p className="text-amber-400 mt-1 font-semibold leading-relaxed">
                ⚠ Flagged {submitState.warnings.length} soft warnings: require admin manual override review.
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400 leading-normal">
                Perfect time windows! Event is in state PENDING and will be synced upon approval.
              </p>
            )}
          </div>
        )}

        {submitState.error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <XCircle className="h-4.5 w-4.5 shrink-0" />
            Error: {submitState.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Event Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Artificial Intelligence Workshop"
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-600 transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide rich details for the event discovery..."
              rows={2}
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-600 transition-all resize-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Venue Location
              </label>
              <select
                name="venueId"
                value={formData.venueId}
                onChange={handleChange}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white transition-all font-medium cursor-pointer"
                required
              >
                <option value="">-- Choose Venue --</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Operating: {v.operating_start.substring(0, 5)} - {v.operating_end.substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Interest Tags (comma separated)
              </label>
              <input
                type="text"
                name="tagsString"
                value={formData.tagsString}
                onChange={handleChange}
                placeholder="tech, academic, social"
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-600 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Start Time (ISO/Local Date)
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white transition-all font-mono cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                End Time (ISO/Local Date)
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white transition-all font-mono cursor-pointer"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitState.loading || (conflictReport.checked && conflictReport.hasHardConflict)}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
          >
            {submitState.loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating ledger overlaps...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Submit Event Proposal
              </>
            )}
          </button>
        </form>
      </div>

      {/* Interactive ConflictPredictor Panel */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="backdrop-glass rounded-2xl p-5 border border-zinc-800 bg-zinc-900/60 flex flex-col gap-4 shadow-xl h-full min-h-[300px]">
          <div>
            <span className="text-[9px] font-bold text-indigo-400 tracking-wider font-mono uppercase bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded">
              REAL-TIME FEEDBACK ENGINE
            </span>
            <h3 className="text-base font-bold text-white tracking-tight mt-1.5 flex items-center gap-1">
              ConflictPredictor™
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Dry-runs scheduling matrix to assess safety.</p>
          </div>

          {conflictReport.loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-mono text-[11px] py-16 gap-2">
              <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
              <span>Analyzing schedule intervals...</span>
            </div>
          ) : !conflictReport.checked ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center py-16 px-4">
              <Clock className="h-7 w-7 text-zinc-700 mb-2" />
              <h4 className="text-xs font-bold text-zinc-400">Ledger Inactive</h4>
              <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px]">
                Input Venue, Start and End date time to kick-start real-time dry-run checks.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              
              {/* Hard Conflicts Check Panel */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wider font-mono">
                    STAGE 1: HARD CONFLICTS (REJECTION)
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold font-mono border ${
                    conflictReport.hasHardConflict
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {conflictReport.hasHardConflict ? 'FAILED' : 'PASSED'}
                  </span>
                </div>
                
                {conflictReport.hasHardConflict ? (
                  <div className="mt-3 bg-rose-500/15 border border-rose-500/20 text-rose-400 p-3 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold font-display">Double-Booking Blocked</h4>
                      <p className="text-[10px] text-rose-500/80 leading-normal mt-0.5">
                        rejection: {conflictReport.warnings.includes('Venue Closed') ? 'Venue is CLOSED during this period. Double-check operational boundaries.' : 'Physical venue space has already been approved for another event schedule.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="h-4 w-4" />
                    No physical overlaps detected in relational ledger.
                  </div>
                )}
              </div>

              {/* Soft Conflicts Check Panel */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 flex-1">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wider font-mono">
                    STAGE 2: SOFT CONFLICTS (WARNINGS)
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold font-mono border ${
                    conflictReport.warnings.length > 0
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {conflictReport.warnings.length > 0 ? `${conflictReport.warnings.length} WARNINGS` : 'SECURE'}
                  </span>
                </div>

                {conflictReport.warnings.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2.5">
                    {conflictReport.warnings.map((warning, index) => (
                      <div key={index} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold block uppercase tracking-wide font-display">
                            {warning.includes('double-booked') && 'Organizer Cross Booking'}
                            {warning.includes('buffer') && 'Back-to-back Buffer Warning'}
                            {warning.includes('Audience') && 'MongoDB Tag Collision'}
                          </span>
                          <span className="text-[10.5px] text-amber-500/80 leading-normal block mt-0.5">
                            {warning}
                          </span>
                        </div>
                      </div>
                    ))}
                    <p className="text-[9.5px] text-zinc-500 mt-2 font-medium">
                      Note: Soft conflicts allow submission, but flag proposal as NEEDS_REVIEW in Admin verification queues.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs font-medium h-full justify-center py-6">
                    <CheckCircle className="h-4 w-4" />
                    No overlap scheduling warnings detected. Safe to submit!
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Guest Scanner Component (Attendance scanner simulation)
 * ============================================================================ */
function GuestAttendanceScannerView() {
  const [scanSignature, setScanSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorResult, setErrorResult] = useState('');

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanSignature.trim()) return;

    setLoading(true);
    setSuccessResult(null);
    setErrorResult('');

    try {
      const res = await fetch('/api/events/rsvp/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrSignature: scanSignature.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessResult(data);
        setScanSignature(''); // Clear input
      } else {
        setErrorResult(data.message || 'Check-in failed');
      }
    } catch (err) {
      setErrorResult('Scanner pipeline offline.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {/* Scanner frame */}
      <div className="md:col-span-2 backdrop-glass rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 shadow-xl flex flex-col items-center justify-center text-center">
        <div>
          <span className="text-[9px] font-bold text-indigo-400 tracking-wider font-mono uppercase bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded">
            Entry QR Validator
          </span>
          <h3 className="text-base font-bold text-white tracking-tight mt-2">
            Camera Scanner Viewfinder
          </h3>
        </div>

        {/* Viewfinder simulator with laser scan line */}
        <div className="w-full max-w-[240px] aspect-square rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 flex flex-col items-center justify-center mt-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-500 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-500 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-500 rounded-br-lg" />

          {/* Scanning Laser Line */}
          <div className="absolute left-0 right-0 h-[2px] bg-indigo-500 shadow-md shadow-indigo-500/60 animate-scanner-laser top-0" />
          
          <Camera className="h-10 w-10 text-zinc-700 animate-pulse" />
        </div>

        <p className="text-[10px] text-zinc-500 font-medium mt-3.5 max-w-[200px]">
          Validator operates in live secure loop scanning unique digital signatures.
        </p>
      </div>

      {/* Manual Check-in control and feedback */}
      <div className="md:col-span-3 backdrop-glass rounded-2xl p-6 border border-zinc-800 bg-zinc-900/40 shadow-xl flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Manual Signature Entry</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Input unique RSVP QR code signatures to validate attendance.</p>
        </div>

        {successResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex flex-col gap-2.5 animate-scale-in">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              CHECK-IN SUCCESSFUL!
            </div>
            <div className="bg-zinc-950/60 border border-zinc-850 p-3 rounded-lg flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono text-[10px]">ATTENDEE EMAIL:</span>
                <span className="font-mono text-zinc-300 font-bold">{successResult.attendee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono text-[10px]">EVENT ID LEDGER:</span>
                <span className="font-mono text-zinc-300 font-bold">#{successResult.eventId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-mono text-[10px]">TIMESTAMP:</span>
                <span className="font-mono text-zinc-400">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">
              Welcome to the event. Transaction state updated in relational database index.
            </p>
          </div>
        )}

        {errorResult && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-center gap-2 font-semibold animate-scale-in">
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
            Access Denied: {errorResult}
          </div>
        )}

        <form onSubmit={handleScanSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Attendee RSVP signature
            </label>
            <input
              type="text"
              value={scanSignature}
              onChange={(e) => setScanSignature(e.target.value)}
              placeholder="e.g. RSVP-1-10-K8J2N"
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 transition-all font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !scanSignature.trim()}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Querying relational signature locks...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4" />
                Simulate QR Scan Check-In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * 3.4. HIGH-PRIVILEGE ADMIN DASHBOARD (Faculty & Approvers)
 * ============================================================================ */
function AdminDashboardView({ admin, refreshTrigger, triggerRefresh }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  
  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Load all proposals from backend MySQL database
  const fetchAllProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events/proposals');
      const data = await res.json();
      if (data.success) {
        setProposals(data.proposals);
      }
    } catch (err) {
      console.error('Error fetching admin proposals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllProposals();
  }, [fetchAllProposals, refreshTrigger]);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`/api/events/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId: admin.id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllProposals();
        triggerRefresh();
      }
    } catch (err) {
      console.error('Error approving proposal:', err);
    }
  };

  const handleRejectClick = (id) => {
    setRejectId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || !rejectId) return;

    setRejectLoading(true);
    try {
      const res = await fetch(`/api/events/${rejectId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: admin.id,
          reason: rejectReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectModal(false);
        fetchAllProposals();
        triggerRefresh();
      }
    } catch (err) {
      console.error('Error rejecting proposal:', err);
    } finally {
      setRejectLoading(false);
    }
  };

  // Filter queue proposals according to tab selection
  const filteredProposals = proposals.filter(p => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return p.status === 'PENDING' || p.status === 'NEEDS_REVIEW';
    return p.status === activeTab;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Admin metrics header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div className="md:col-span-2">
          <span className="text-[10px] font-bold text-indigo-400 tracking-widest font-mono uppercase bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-0.5 rounded-full inline-block">
            HIGH-PRIVILEGE AUDIT CONSOLE
          </span>
          <h2 className="text-2xl font-black font-display text-white mt-2 leading-none uppercase">
            Faculty Approvals Hub
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-medium font-mono truncate">{admin.email} (Administrator)</p>
        </div>

        {/* Stats metrics */}
        <div className="backdrop-glass rounded-xl p-3 px-4 border border-zinc-800/80 bg-zinc-900/40 flex justify-between items-center shadow-md">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider font-mono">PENDING APPROVAL</span>
            <h3 className="text-xl font-extrabold text-blue-400 mt-0.5 font-mono">
              {proposals.filter(p => p.status === 'PENDING').length}
            </h3>
          </div>
          <Clock className="h-5 w-5 text-blue-500/60" />
        </div>

        <div className="backdrop-glass rounded-xl p-3 px-4 border border-zinc-800/80 bg-zinc-900/40 flex justify-between items-center shadow-md">
          <div>
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider font-mono">SOFT CONFLICTS</span>
            <h3 className="text-xl font-extrabold text-amber-500 mt-0.5 font-mono">
              {proposals.filter(p => p.status === 'NEEDS_REVIEW').length}
            </h3>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500/60" />
        </div>
      </div>

      {/* Review Queue Queue Container */}
      <div className="backdrop-glass rounded-2xl p-6 border border-zinc-800 bg-zinc-900/40 shadow-xl flex flex-col gap-5">
        
        {/* Tab Selection */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-zinc-800 pb-4">
          <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-850 gap-1 text-[11px] font-bold">
            {[
              { id: 'ALL', label: '🗂 All Proposals' },
              { id: 'PENDING', label: '⏱ Review Queue' },
              { id: 'APPROVED', label: '✓ Approved Feed' },
              { id: 'REJECTED', label: '✗ Rejected' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            SHOWING {filteredProposals.length} OF {proposals.length} PROPOSALS
          </span>
        </div>

        {/* Proposals List Card container */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">Querying database nodes...</div>
          ) : filteredProposals.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 flex flex-col items-center justify-center">
              <FileText className="h-10 w-10 text-zinc-700 mb-2" />
              <span className="text-xs font-bold font-mono">Queue is empty</span>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
                There are no scheduling proposals in this relational index folder.
              </p>
            </div>
          ) : (
            filteredProposals.map(prop => {
              const hasWarnings = prop.status === 'NEEDS_REVIEW';
              return (
                <div
                  key={prop.id}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-750 p-5 rounded-2xl transition-all duration-300 shadow-md flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white tracking-tight leading-snug">
                          {prop.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border ${
                          prop.status === 'APPROVED' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        } ${
                          prop.status === 'PENDING' && 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        } ${
                          prop.status === 'NEEDS_REVIEW' && 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        } ${
                          prop.status === 'REJECTED' && 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {prop.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono block mt-1 uppercase font-semibold">
                        PROPOSED BY {prop.organizerName} ({prop.organizerEmail})
                      </span>
                    </div>

                    {/* Meta row stats */}
                    <div className="flex gap-3 text-[11px] font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                      <div className="flex items-center gap-1.5 pr-3 border-r border-zinc-800">
                        <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span>{prop.venueName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span>
                          {new Date(prop.startTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ConflictDetailsPanel: if needs review / flagged soft conflicts */}
                  {hasWarnings && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <AlertTriangle className="h-4.5 w-4.5" />
                        AUTO-FLAGGED SCHEDULING CONFLICTS
                      </div>
                      <p className="text-[11.5px] text-amber-500/80 leading-relaxed font-medium">
                        The conflict-prevention engine detected soft double-booking warnings for this slot. Approving this proposal will overwrite and register the schedule overrides.
                      </p>
                      <div className="bg-zinc-950/80 rounded-lg p-2 px-3 border border-zinc-850 text-[11px] text-zinc-400 font-medium">
                        • Conflict warnings synced: Double booking checks flag potential audience overlap or venue adjacency buffers.
                      </div>
                    </div>
                  )}

                  {/* Review Action Buttons */}
                  {(prop.status === 'PENDING' || prop.status === 'NEEDS_REVIEW') && (
                    <div className="flex items-center gap-3 border-t border-zinc-800 pt-4 mt-1">
                      <button
                        onClick={() => handleApprove(prop.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                      >
                        <CheckCircle className="h-4.5 w-4.5" />
                        Approve Proposal
                      </button>
                      <button
                        onClick={() => handleRejectClick(prop.id)}
                        className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="h-4.5 w-4.5" />
                        Reject with Reason
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reject reason popup overlay */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-glass max-w-sm w-full rounded-2xl p-6 shadow-2xl relative bg-zinc-900 border border-zinc-700/50">
            <button
              onClick={() => setShowRejectModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              Provide Rejection Reason
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Feedback will log into the approvals history.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 flex flex-col gap-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule conflicts are too high; please reschedule to Venue B or adjust start time by 30 mins."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-600 transition-all resize-none font-medium"
                required
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-transparent text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectLoading || !rejectReason.trim()}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {rejectLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
