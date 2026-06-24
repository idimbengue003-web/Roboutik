import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Scale } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Mentions légales — Roboutik",
  description: "Mentions légales de Roboutik, plateforme d'achat Roblox avec paiement Wave.",
};

export default function LegalNoticesPage() {
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
              <Scale className="size-6 text-fuchsia-600" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Mentions légales
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Dernière mise à jour : juin 2026
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Éditeur de la plateforme</h2>
            <p className="text-sm text-slate-700">
              Roboutik est éditée par [Ton nom / raison sociale], domicilié·e à [Adresse complète], Sénégal.
            </p>
            <p className="text-sm text-slate-700">
              Contact : <a href="mailto:contact@roboutik.sn" className="text-fuchsia-600 underline">contact@roboutik.sn</a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Hébergement</h2>
            <p className="text-sm text-slate-700">
              La plateforme est hébergée par Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis).
              Base de données hébergée par Neon (serverless PostgreSQL).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Propriété intellectuelle</h2>
            <p className="text-sm text-slate-700">
              Roboutik, son logo, son code source et ses contenus originaux sont la propriété exclusive de l'éditeur.
              Toute reproduction sans autorisation est interdite.
            </p>
            <p className="text-sm text-slate-700">
              Les marques, images et noms de jeux Roblox cités appartiennent à leurs propriétaires respectifs.
              Roboutik n'est pas affilié·e à Roblox Corporation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Responsabilité</h2>
            <p className="text-sm text-slate-700">
              Roboutik est une plateforme de mise en relation entre acheteurs et vendeurs.
              L'éditeur ne peut être tenu responsable des transactions entre utilisateurs,
              ni des contenus postés par les vendeurs (descriptions, prix, objets).
            </p>
            <p className="text-sm text-slate-700">
              L'éditeur s'engage néanmoins à appliquer des mesures de modération
              (bannissement, signalement, support) pour maintenir la qualité de la plateforme.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Paiements</h2>
            <p className="text-sm text-slate-700">
              Les paiements sont traités par Wave Business (Wave Sénégal).
              Roboutik ne stocke aucune information bancaire.
              Une commission de 16% est prélevée par la plateforme sur chaque vente validée.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Contact</h2>
            <p className="text-sm text-slate-700">
              Pour toute question relative aux mentions légales : <a href="mailto:contact@roboutik.sn" className="text-fuchsia-600 underline">contact@roboutik.sn</a>
            </p>
          </section>

          <footer className="border-t pt-4 flex flex-wrap gap-3">
            <Link href="/legal/terms">
              <Button variant="outline" size="sm" className="rounded-full">
                <FileText className="size-4" />
                Conditions générales
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
