export function productReport(db){
 const now=Date.now(),day=86400000;
 const eligible=db.prepare('SELECT id,created_at FROM users WHERE created_at<?').all(now-2*day);
 const returned=eligible.filter(u=>db.prepare("SELECT 1 FROM analytics WHERE user_id=? AND event='game_session' AND created_at>=? AND created_at<? LIMIT 1").get(u.id,u.created_at+day,u.created_at+2*day)).length;
 const sessions=db.prepare("SELECT metadata FROM analytics WHERE event='session_end' AND created_at>?").all(now-30*day).map(r=>JSON.parse(r.metadata||'{}').duration).filter(v=>Number.isFinite(v)&&v>0);
 return {dayOneRetention:eligible.length?returned/eligible.length:null,eligibleCohort:eligible.length,returningCohort:returned,averageSessionSeconds:sessions.length?Math.round(sessions.reduce((a,b)=>a+b,0)/sessions.length):null,recordedSessions:sessions.length,trafficSources:db.prepare("SELECT source,COUNT(*) pageViews FROM analytics WHERE event='page_view' GROUP BY source ORDER BY pageViews DESC").all()};
}
