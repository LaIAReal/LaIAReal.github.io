(function () {
  const config = window.LAIAREAL_SITE || {};

  document.querySelectorAll("[data-launch-date]").forEach((element) => {
    element.textContent = config.launchDate || "próximamente";
  });

  const storeLinks = {
    kindle: config.kindleUrl,
    paperback: config.paperbackUrl
  };

  Object.entries(storeLinks).forEach(([format, url]) => {
    document.querySelectorAll(`[data-store-link="${format}"]`).forEach((link) => {
      if (url) {
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = format === "kindle" ? "Comprar en Kindle" : "Comprar en tapa blanda";
      } else {
        link.href = "#kit";
      }
    });
  });

  document.querySelectorAll("[data-contact-email]").forEach((link) => {
    const email = config.contactEmail || "contacto@laiareal.com";
    link.href = `mailto:${email}`;
    if (!link.textContent.trim()) link.textContent = email;
  });

  document.querySelectorAll("[data-linkedin]").forEach((link) => {
    link.href = config.linkedInUrl || "https://www.linkedin.com/in/antoniosql/";
  });

  const form = document.querySelector("[data-kit-form]");
  if (form) {
    if (config.formAction) form.action = config.formAction;
    const redirect = form.querySelector('input[name="_next"]');
    if (redirect && config.kitRedirect) redirect.value = config.kitRedirect;
  }

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
