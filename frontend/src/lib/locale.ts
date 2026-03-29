export function setLocaleCookie(nextLocale: string) {
  let cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;SameSite=Lax`;
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    cookie += ";Secure";
  }
  document.cookie = cookie;
}
