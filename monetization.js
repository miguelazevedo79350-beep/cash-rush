/**
 * Cash Rush — config monétisation créateur
 * -----------------------------------------
 * DEMO_MODE = true  → pubs/skins simulés (test local)
 * DEMO_MODE = false → prêt pour vrais SDKs (AdSense / Stripe Checkout)
 *
 * Pour gagner vraiment :
 * 1) Héberge le jeu (Netlify, Vercel, GitHub Pages…)
 * 2) AdSense : colle ton snippet dans #adSlot
 * 3) Stripe : crée des Payment Links / Checkout pour chaque skin
 *    et mets les URLs dans skins[].checkoutUrl
 */
window.CASH_RUSH_MONETIZATION = {
  DEMO_MODE: true,

  // Revenu pub estimé en démo (centimes d’euro par “impression”)
  demoAdEcpmEur: 0.02,

  // Boost après pub récompensée
  rewardedBoost: {
    multiplier: 2,
    durationSec: 60,
    cooldownSec: 90,
    watchSec: 5,
  },

  skins: [
    {
      id: "classic",
      name: "Classique",
      desc: "Vert & or d’origine.",
      priceEur: 0,
      free: true,
      checkoutUrl: "",
    },
    {
      id: "neon",
      name: "Neon Mint",
      desc: "Anneau fluo, vibe arcade.",
      priceEur: 1.99,
      free: false,
      checkoutUrl: "", // ex: "https://buy.stripe.com/xxxxx"
    },
    {
      id: "gold",
      name: "Gold Rush",
      desc: "Look premium tout doré.",
      priceEur: 2.99,
      free: false,
      checkoutUrl: "",
    },
    {
      id: "midnight",
      name: "Midnight Blue",
      desc: "Bleu nuit + accents argent.",
      priceEur: 2.49,
      free: false,
      checkoutUrl: "",
    },
  ],
};
