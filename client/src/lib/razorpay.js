import { api } from "./api";

let checkoutScriptPromise;

const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => {
        checkoutScriptPromise = null;
        reject(new Error("Could not load secure Razorpay Checkout."));
      };
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
};

export async function payBillWithRazorpay(billId, description = "Hospital invoice payment") {
  await loadCheckout();
  const order = await api(`/billing-ops/${billId}/razorpay/order`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  return new Promise((resolve, reject) => {
    let completed = false;
    const checkout = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "MANIT Health System",
      description,
      order_id: order.order_id,
      handler: async (response) => {
        completed = true;
        try {
          const verified = await api(`/billing-ops/${billId}/razorpay/verify`, {
            method: "POST",
            body: JSON.stringify(response),
          });
          resolve(verified);
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => { if (!completed) reject(new Error("Checkout was closed. The invoice is still unpaid.")); } },
      theme: { color: "#155eef" },
    });
    checkout.on("payment.failed", (response) => {
      completed = true;
      reject(new Error(response.error?.description || "Payment failed. No payment was recorded."));
    });
    checkout.open();
  });
}
