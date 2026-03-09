import type { Metadata } from "next";
import { SubscriptionClient } from "@/app/subscription/subscription-client";

export const metadata: Metadata = {
  title: "Subscription",
  description: "Choose a plan to unlock premium features."
};

export default function SubscriptionPage() {
  return <SubscriptionClient />;
}

