export default defineNuxtPlugin(() => {
  if (process.env.NODE_ENV !== "production") return;

  const loadVisitorsScript = () => {
    // Remove existing script if present
    const existingScript = document.querySelector('script[src="https://cdn.visitors.now/v.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://cdn.visitors.now/v.js";
    script.setAttribute("data-token", "4b787264-9a0d-4ab4-b307-197cec9afeb4");
    script.async = true;
    script.defer = true;

    // Check if user has accepted cookies
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (cookieConsent === "accepted") {
      script.setAttribute("data-persist", "");
    }

    document.head.appendChild(script);
  };

  // Load script on initial page load
  loadVisitorsScript();

  // Expose function to reload script when consent changes
  return {
    provide: {
      reloadVisitorsScript: loadVisitorsScript,
    },
  };
});
