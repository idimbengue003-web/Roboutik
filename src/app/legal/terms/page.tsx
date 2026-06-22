import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Scale } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Conditions générales d'utilisation — Roboutik",
  description: "CGU de Roboutik, plateforme d'achat Roblox avec paiement Wave.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50/40 via-white to-orange-50/40">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 text-slate-600">
            <ArrowLeft className="size-4" />
            Retour à Roboutik
          </Button>
        </Link>

        <div className="rounded-3xl bg-white border shadow-sm p-6 sm:p-10 space-y-6">
          <header className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="size-6 text-fuchsia-600" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Conditions générales d'utilisation
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Dernière mise à jour : juin 2026
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 1 — Objet</h2>
            <p className="text-sm text-slate-700">
              Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'utilisation
              de la plateforme Roboutik (le « Site »), accessible à l'adresse
              <a href="https://roboutik.vercel.app" className="text-fuchsia-600 underline"> https://roboutik.vercel.app</a>.
            </p>
            <p className="text-sm text-slate-700">
              Roboutik est une plateforme de mise en relation entre acheteurs et vendeurs
              d'objets, comptes et boosters liés aux jeux Roblox.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 2 — Acceptation</h2>
            <p className="text-sm text-slate-700">
              L'inscription et l'utilisation du Site impliquent l'acceptation pleine et entière
              des présentes CGU. Tout utilisateur refusant ces conditions ne peut utiliser le Site.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 3 — Inscription et compte</h2>
            <p className="text-sm text-slate-700">
              L'inscription se fait via Google OAuth. L'utilisateur s'engage à fournir des informations
              exactes et à ne pas créer de compte au nom d'un tiers.
            </p>
            <p className="text-sm text-slate-700">
              L'utilisateur est responsable de la conservation de son compte Google et s'engage à
              ne pas le partager. Toute activité depuis son compte est réputée effectuée par lui.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 4 — Règles de conduite</h2>
            <p className="text-sm text-slate-700">L'utilisateur s'engage à :</p>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li>Ne pas publier de contenus illégaux, frauduleux, diffamatoires ou injurieux</li>
              <li>Ne pas créer de fausses annonces ou manipuler les prix</li>
              <li>Ne pas tenter de contourner le système de paiement Wave</li>
              <li>Respecter les autres utilisateurs (acheteurs, vendeurs, support)</li>
              <li>Ne pas créer plusieurs comptes pour contourner un bannissement</li>
              <li>Ne pas utiliser de bots ou scripts pour automatiser le Site</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 5 — Transactions et paiements</h2>
            <p className="text-sm text-slate-700">
              Les paiements s'effectuent via Wave Business. Le montant payé par l'acheteur inclut
              une commission de 20% prélevée par la plateforme. Le vendeur reçoit le montant net
              (prix vendeur) à la validation de la commande.
            </p>
            <p className="text-sm text-slate-700">
              La commande se valide automatiquement 24 heures après le paiement si l'acheteur
              ne valide pas manuellement. Cette mesure protège les vendeurs contre les acheteurs
              qui ne valident jamais.
            </p>
            <p className="text-sm text-slate-700">
              L'acheteur peut signaler un vendeur si la livraison n'a pas eu lieu. Le signalement
              suspend la validation automatique jusqu'à examen par un administrateur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 6 — Commission</h2>
            <p className="text-sm text-slate-700">
              La commission de Roboutik est de 20% du prix net vendeur. Elle est calculée
              automatiquement à la création de l'annonce :
              prix affiché à l'acheteur = prix net vendeur × 1,20.
            </p>
            <p className="text-sm text-slate-700">
              Cette commission finance le développement, l'hébergement, le support
              et la sécurité de la plateforme.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 7 — Retraits vendeur</h2>
            <p className="text-sm text-slate-700">
              Les vendeurs peuvent demander un retrait de leur solde vers leur compte Wave.
              Les retraits sont traités manuellement par un administrateur sous 48h ouvrées.
              L'administrateur peut refuser un retrait en cas de doute (remboursement du vendeur).
            </p>
            <p className="text-sm text-slate-700">
              Le montant minimum de retrait est de 500 FCFA, le maximum de 5 000 000 FCFA.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 8 — Bannissement</h2>
            <p className="text-sm text-slate-700">
              L'éditeur se réserve le droit de bannir tout utilisateur ne respectant pas les CGU.
              Le banni ne peut plus acheter, vendre, retirer ou contacter le support
              (sauf pour faire appel de son bannissement).
            </p>
            <p className="text-sm text-slate-700">
              Les fonds en solde d'un utilisateur banni restent bloqués pendant la durée du ban
              et peuvent être remboursés aux acheteurs lésés si une fraude est avérée.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 9 — Données personnelles</h2>
            <p className="text-sm text-slate-700">
              Le traitement des données personnelles est décrit dans la
              <Link href="/legal/privacy" className="text-fuchsia-600 underline"> Politique de confidentialité</Link>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 10 — Modification des CGU</h2>
            <p className="text-sm text-slate-700">
              L'éditeur se réserve le droit de modifier les présentes CGU à tout moment.
              Les utilisateurs seront notifiés par email des changements importants.
              La poursuite de l'utilisation du Site vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Article 11 — Droit applicable</h2>
            <p className="text-sm text-slate-700">
              Les présentes CGU sont régies par le droit sénégalais.
              Tout litige relèvera des tribunaux de Dakar.
            </p>
          </section>

          <footer className="border-t pt-4 flex flex-wrap gap-3">
            <Link href="/legal/notices">
              <Button variant="outline" size="sm" className="rounded-full">
                <Scale className="size-4" />
                Mentions légales
              </Button>
            </Link>
            <Link href="/legal/privacy">
              <Button variant="outline" size="sm" className="rounded-full">
                <Shield className="size-4" />
                Politique de confidentialité
              </Button>
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
