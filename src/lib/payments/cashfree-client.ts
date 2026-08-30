declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cashfree?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadCashfreeSDK(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (window.Cashfree) return window.Cashfree;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("cashfree-js-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Cashfree));
      return;
    }

    const script = document.createElement("script");
    script.id = "cashfree-js-sdk";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(window.Cashfree);
    script.onerror = () => reject(new Error("Failed to load Cashfree checkout SDK."));
    document.body.appendChild(script);
  });
}
