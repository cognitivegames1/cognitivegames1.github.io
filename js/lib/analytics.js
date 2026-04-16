/**
 * PostHog bootstrap. Loaded by lobby.js, play.js, and tests/play.js so every
 * page gets it without touching individual HTML files.
 *
 * Project key is a public "ph_*" key intended to ship in client code.
 * Lock the project by domain in the PostHog dashboard, not in source.
 */

!(function (t, e) {
  var o, n, p, r;
  if (e.__SV || (window.posthog && window.posthog.__loaded)) return;
  window.posthog = e;
  e._i = [];
  e.init = function (i, s, a) {
    function g(t, e) {
      var o = e.split(".");
      if (o.length === 2) { t = t[o[0]]; e = o[1]; }
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    }
    p = t.createElement("script");
    p.type = "text/javascript";
    p.crossOrigin = "anonymous";
    p.async = true;
    p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
    r = t.getElementsByTagName("script")[0];
    r.parentNode.insertBefore(p, r);
    var u = e;
    if (a !== undefined) u = e[a] = [];
    else a = "posthog";
    u.people = u.people || [];
    u.toString = function (t) {
      var e = "posthog";
      if (a !== "posthog") e += "." + a;
      if (!t) e += " (stub)";
      return e;
    };
    u.people.toString = function () { return u.toString(1) + ".people (stub)"; };
    o = "init Dr qr Ci Br Zr Pr capture calculateEventProperties Ur register register_once register_for_session unregister unregister_for_session Xr getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Jr identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty Gr Hr createPersonProfile setInternalOrTestUser Wr Fr tn opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing $r debug ki Yr getPageViewId captureTraceFeedback captureTraceMetric Rr".split(" ");
    for (n = 0; n < o.length; n++) g(u, o[n]);
    e._i.push([i, s, a]);
  };
  e.__SV = 1;
})(document, window.posthog || []);

window.posthog.init("phc_y5wcjEPq3aAaCmbGfFA9bP9NjU8QMjFS2sAzBJnHbLrg", {
  api_host: "https://us.i.posthog.com",
  defaults: "2026-01-30",
  person_profiles: "identified_only",
});

export const posthog = window.posthog;
