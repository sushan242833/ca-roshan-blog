import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import ContactForm from "@/components/contact/contact-form";
import { CONTACT_EMAIL, SITE_NAME } from "@/config/site.config";

export const metadata: Metadata = {
  title: `Contact | ${SITE_NAME}`,
  description:
    "Get in touch with CA Roshan for expert tax and financial advisory services in Nepal.",
};

// TODO: replace with the real office phone number once available.
const CONTACT_PHONE = "+977 1 4XXXXXX";
// TODO: replace with the real office address once available.
const OFFICE_ADDRESS = "123 Financial District, Kathmandu, Nepal";

export default function ContactPage() {
  return (
    <div className="bg-white">
      {/* Heading */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-serif text-4xl font-bold text-brand-navy md:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-3 max-w-2xl text-gray-500">
            Expert financial guidance is just a message away. Reach out to
            schedule a consultation or submit an inquiry regarding our
            services.
          </p>
        </div>
      </section>

      {/* Form + sidebar */}
      <section className="pb-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Direct Contact */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="font-serif text-lg font-bold text-brand-navy">
                Direct Contact
              </h2>
              <div className="mt-4 space-y-3">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 text-sm text-gray-700 transition-colors hover:text-brand-teal"
                >
                  <Mail size={18} className="shrink-0 text-brand-teal" />
                  {CONTACT_EMAIL}
                </a>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Phone size={18} className="shrink-0 text-brand-teal" />
                  {CONTACT_PHONE}
                </div>
              </div>
            </div>

            {/* Office */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="font-serif text-lg font-bold text-brand-navy">
                Office
              </h2>
              <div className="mt-4 flex items-start gap-3 text-sm text-gray-700">
                <MapPin size={18} className="mt-0.5 shrink-0 text-brand-teal" />
                <span>{OFFICE_ADDRESS}</span>
              </div>
              <div className="mt-4 flex h-40 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
                Kathmandu, Nepal
              </div>
            </div>

            {/* Consultation Hours */}
            <div className="rounded-lg border border-gray-200 p-6">
              <h2 className="font-serif text-lg font-bold text-brand-navy">
                Consultation Hours
              </h2>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Clock size={18} className="shrink-0 text-brand-teal" />
                  Sun - Fri: 9:00 AM - 6:00 PM
                </div>
                <p className="pl-[30px] text-sm font-medium text-brand-teal">
                  Sat: Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
