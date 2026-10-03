export async function loadRazorpaySDK(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Cannot load SDK on server"));
    }

    if ((window as any).Razorpay) return resolve((window as any).Razorpay);

    const existing = document.getElementById("razorpay-js-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).Razorpay));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK.")));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-js-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve((window as any).Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout SDK."));
    document.body.appendChild(script);
  });
}
