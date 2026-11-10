/*
 * RLA website lead tracking, for the WordPress site (not this app).
 *
 * Remembers how a visitor reached the site (search engine, AI assistant, ad,
 * social, referral, or direct) and copies it into hidden fields on every
 * Fluent Forms form, so the SEO Dashboard can classify each lead's source.
 * Without it, a form only knows the page it was submitted on.
 *
 * Install site-wide, in the footer (WPCode or the theme), as a <script>.
 * Each form needs these Hidden Fields (Fluent Forms > Advanced Fields >
 * Hidden Field), with these exact Name Attributes:
 *   rla_referrer, rla_landing_page, rla_utm_source, rla_utm_medium,
 *   rla_utm_campaign, rla_page_url
 *
 * Stores nothing personal: only the referring site, the landing page path, and
 * campaign tags, in this browser's localStorage, for 90 days.
 */
(function () {
  var KEY = "rla_touch";
  var MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
  var site = location.hostname.replace(/^www\./, "");

  function read() {
    try {
      var value = JSON.parse(localStorage.getItem(KEY) || "null");
      return value && Date.now() - value.at < MAX_AGE_MS ? value : null;
    } catch {
      return null;
    }
  }

  function write(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      // Storage blocked: this page still fills the fields from its own visit.
    }
  }

  var params = new URLSearchParams(location.search);
  var referrerHost = "";
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    referrerHost = "";
  }
  var external = referrerHost !== "" && referrerHost !== site && !referrerHost.endsWith("." + site);

  var source = params.get("utm_source") || "";
  var medium = params.get("utm_medium") || "";
  var campaign = params.get("utm_campaign") || "";
  // Ad platforms' auto-tagging, when the link has no utm tags.
  var googleClick = params.get("gclid") || params.get("gbraid") || params.get("wbraid");
  if (!medium && (googleClick || params.get("msclkid"))) {
    source = source || (googleClick ? "google" : "bing");
    medium = "cpc";
  }
  if (!source && params.get("fbclid")) {
    source = "facebook";
    medium = medium || "social";
  }

  // The latest visit with a known source wins; moving between pages, or coming
  // back directly, keeps it.
  var stored = read();
  var page = location.origin + location.pathname;
  if (source || medium || external) {
    stored = {
      referrer: external ? document.referrer.split("?")[0] : "",
      landing_page: page,
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      at: Date.now(),
    };
    write(stored);
  } else if (!stored && !document.referrer) {
    // Typed the address or used a bookmark: genuinely direct.
    stored = { referrer: "", landing_page: page, utm_source: "(direct)", utm_medium: "(none)", utm_campaign: "", at: Date.now() };
    write(stored);
  }
  // Otherwise (an internal page with nothing stored, e.g. storage blocked) the
  // source stays blank and the dashboard shows "Unknown" rather than guessing.

  function fill() {
    var touch = read() || stored || {};
    var values = {
      rla_referrer: touch.referrer,
      rla_landing_page: touch.landing_page,
      rla_utm_source: touch.utm_source,
      rla_utm_medium: touch.utm_medium,
      rla_utm_campaign: touch.utm_campaign,
      rla_page_url: location.origin + location.pathname,
    };
    Object.keys(values).forEach(function (name) {
      var inputs = document.querySelectorAll('input[name="' + name + '"]');
      for (var index = 0; index < inputs.length; index++) inputs[index].value = values[name] || "";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill);
  else fill();
  // Also just before sending, for forms that appear later (popups, tabs).
  document.addEventListener("submit", fill, true);
})();
