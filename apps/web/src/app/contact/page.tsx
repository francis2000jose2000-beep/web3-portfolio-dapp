import type { Metadata } from "next";
import { ContactClient } from "@/app/contact/contact-client";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a message to the team."
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return <ContactClient />;
}

