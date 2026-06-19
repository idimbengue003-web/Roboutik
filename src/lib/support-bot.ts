// Support bot: classifies user message and produces an auto-response.

export type TicketCategory =
  | "PAYMENT"
  | "DELIVERY"
  | "SELLER"
  | "BUG"
  | "ACCOUNT"
  | "OTHER";

export type BotResponse = {
  category: TicketCategory;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  response: string;
  escalate: boolean; // true if the bot cannot handle this and needs a human
  suggestedActions: string[];
};

const KEYWORDS: Record<TicketCategory, string[]> = {
  PAYMENT: [
    "paiement", "payer", "wave", "paye", "debite", "débité", "argent",
    "transaction", "fcfa", "somme", "montant", "facture", "transferer",
    "transféré", "envoye", "envoyé",
  ],
  DELIVERY: [
    "livraison", "livre", "livré", "recu", "reçu", "delai", "délai",
    "attente", "longtemps", "vendeur livre", "livrer", "delivrer",
  ],
  SELLER: [
    "vendeur", "arnaque", "arnaqué", "arnaquee", "escroquerie", "vendeuse",
    "ne repond pas", "ne répond pas", "pas de réponse", "pas de reponse",
    "silence", "absent", "disparu", "ghost", "malhonnête", "malhonnete",
  ],
  BUG: [
    "bug", "erreur", "error", "marche pas", "plante", "crash", "casse",
    "affiche", "ecran", "bouton", "ne fonctionne pas", "ne marche pas",
    "cassé", "page blanche", "impossible", "bloque", "bloqué",
  ],
  ACCOUNT: [
    "compte", "connexion", "connecter", "google", "banni", "ban",
    "suspendu", "bloque", "bloqué", "access", "acces", "accès",
    "deconnexion", "déconnexion", "oubli", "perdu",
  ],
  OTHER: [],
};

const URGENT_KEYWORDS = [
  "arnaque", "arnaqué", "arnaquee", "escroquerie", "fraude", "voleur",
  "malhonnête", "malhonnete", "menace", "insulte",
];

const HIGH_PRIORITY_KEYWORDS = [
  "bloque", "bloqué", "impossible", "urgence", "urgent",
];

export function classifyMessage(message: string): BotResponse {
  const lower = message.toLowerCase();

  // Detect category
  let bestCategory: TicketCategory = "OTHER";
  let bestScore = 0;

  (Object.keys(KEYWORDS) as TicketCategory[]).forEach((cat) => {
    const keywords = KEYWORDS[cat];
    if (keywords.length === 0) return;
    const score = keywords.reduce(
      (s, kw) => s + (lower.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  });

  // Detect priority
  let priority: BotResponse["priority"] = "NORMAL";
  if (URGENT_KEYWORDS.some((kw) => lower.includes(kw))) {
    priority = "URGENT";
  } else if (HIGH_PRIORITY_KEYWORDS.some((kw) => lower.includes(kw))) {
    priority = "HIGH";
  }

  // Generate response
  const response = generateResponse(bestCategory, priority, lower);
  const suggestedActions = getSuggestedActions(bestCategory);

  // Escalate to admin if urgent or no good match
  const escalate = priority === "URGENT" || bestCategory === "OTHER" || bestScore === 0;

  return {
    category: bestCategory,
    priority,
    response,
    escalate,
    suggestedActions,
  };
}

function generateResponse(
  category: TicketCategory,
  priority: BotResponse["priority"],
  _message: string
): string {
  if (priority === "URGENT") {
    return `🚨 Ton message indique un problème sérieux (arnaque, fraude ou comportement inapproprié). Un administrateur va te contacter très rapidement — en général sous 1h. En attendant, ne valide AUCUNE commande si tu as un doute, et conserve les captures d'écran de tes échanges avec le vendeur.`;
  }

  switch (category) {
    case "PAYMENT":
      return `💸 Je vois que tu as un souci de paiement. Voici ce que tu peux vérifier :\n\n• As-tu bien reçu la confirmation Wave après le paiement ? Si oui, le vendeur a été notifié automatiquement.\n• Si Wave a débité mais que tu ne vois pas la commande dans "Mes Commandes", rafraîchis la page (elle devrait apparaître sous 30 secondes).\n• Si tu n'as pas été débité·e, retourne sur l'annonce et clique à nouveau sur "Payer avec Wave".\n\nSi le problème persiste, un admin prendra le relais. N'oublie pas : ta commande se valide automatiquement après 24h si tu ne valides pas toi-même.`;

    case "DELIVERY":
      return `📦 Pour un souci de livraison, voici les étapes :\n\n1. Vérifie que tu as bien écrit au vendeur dans le chat de la commande (bouton "Ouvrir la discussion").\n2. Le vendeur doit te livrer après ton paiement. Tu peux le relancer avec "Je suis prêt·e".\n3. Si le vendeur ne répond pas après plusieurs heures, NE VALIDE PAS la commande — un admin peut intervenir.\n4. La commande se valide automatiquement après 24h, donc si tu ne valides pas, le vendeur sera quand même payé.\n\nUn admin va vérifier ton ticket et contacter le vendeur si besoin.`;

    case "SELLER":
      return `🛡️ Si tu penses avoir affaire à un vendeur malhonnête :\n\n• NE VALIDE PAS la commande si tu n'as pas reçu ce que tu as payé.\n• Garde toutes les captures d'écran de la conversation.\n• Note le pseudo du vendeur et le titre de l'annonce.\n\nUn admin va examiner ce ticket et peut bannir le vendeur si la fraude est avérée. Tu seras remboursé·e si c'est le cas.`;

    case "BUG":
      return `🐛 Pour un bug technique :\n\n1. Essaie de rafraîchir la page (Ctrl+R ou tirer vers le bas sur mobile).\n2. Vide le cache de ton navigateur si le problème persiste.\n3. Réessaie de te déconnecter puis reconnecter avec Google.\n\nSi le bug bloque une commande en cours, un admin va te contacter pour débloquer la situation manuellement.`;

    case "ACCOUNT":
      return `👤 Pour un souci de compte :\n\n• Si tu n'arrives pas à te connecter avec Google, vérifie que tu utilises le bon compte Google.\n• Si ton compte est banni, tu devrais voir un message t'expliquant pourquoi. Tu peux faire appel ici.\n• Pour changer ton pseudo, connecte-toi et demande à un admin.\n\nUn admin va examiner ta demande.`;

    case "OTHER":
    default:
      return `👋 Merci pour ton message ! Un administrateur va te répondre dans les plus brefs délais (en général sous 2h en journée). En attendant, n'hésite pas à ajouter tous les détails utiles : numéro de commande, pseudo du vendeur, capture d'écran, etc.`;
  }
}

function getSuggestedActions(category: TicketCategory): string[] {
  switch (category) {
    case "PAYMENT":
      return [
        "Vérifier mes commandes",
        "Contacter le vendeur",
        "Demander un remboursement",
      ];
    case "DELIVERY":
      return [
        "Ouvrir le chat avec le vendeur",
        "Vérifier le statut de ma commande",
        "Demander l'intervention d'un admin",
      ];
    case "SELLER":
      return [
        "Signaler le vendeur",
        "Demander un remboursement",
        "Bloquer ce vendeur",
      ];
    case "BUG":
      return [
        "Rafraîchir la page",
        "Vider le cache",
        "Signaler le bug à un admin",
      ];
    case "ACCOUNT":
      return [
        "Changer de compte Google",
        "Faire appel d'un bannissement",
        "Modifier mon pseudo",
      ];
    default:
      return ["Attendre un admin"];
  }
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  PAYMENT: "Paiement",
  DELIVERY: "Livraison",
  SELLER: "Vendeur",
  BUG: "Bug technique",
  ACCOUNT: "Compte",
  OTHER: "Autre",
};

export const CATEGORY_ICON: Record<TicketCategory, string> = {
  PAYMENT: "💸",
  DELIVERY: "📦",
  SELLER: "🛡️",
  BUG: "🐛",
  ACCOUNT: "👤",
  OTHER: "❓",
};
