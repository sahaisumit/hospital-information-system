import express from "express";
import { auth, roles } from "../middleware/auth.js";
import {
  getBills,
  getBillById,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getBillReceipt,
  collectCashPayment,
} from "../controllers/billingController.js";

const router = express.Router();

router.get(
  "/",
  auth,
  roles("admin", "receptionist", "accountant", "patient"),
  getBills,
);
router.get(
  "/:id",
  auth,
  roles("admin", "receptionist", "accountant", "patient"),
  getBillById,
);
router.post("/razorpay-webhook", handleRazorpayWebhook);
router.post("/:id/cash-payment", auth, roles("admin", "receptionist", "accountant"), collectCashPayment);
router.post("/:id/razorpay/order", auth, roles("admin", "receptionist", "accountant", "patient"), createRazorpayOrder);
router.post("/:id/razorpay/verify", auth, roles("admin", "receptionist", "accountant", "patient"), verifyRazorpayPayment);
router.get(
  "/:id/receipt",
  auth,
  roles("admin", "receptionist", "accountant", "patient"),
  getBillReceipt,
);

export default router;
