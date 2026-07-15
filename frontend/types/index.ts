export interface Service {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  altText: string;
  sort: number;
}

export interface PricingTier {
  range: string;
  price: string;
}

export interface Pricing {
  id: string;
  service: string;
  sort: number;
  tiers: PricingTier[];
}

export interface Testimonial {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  altText: string;
  sort: number;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message: string;
  privacyAccepted: true;
}
