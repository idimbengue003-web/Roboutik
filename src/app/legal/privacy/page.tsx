import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Scale } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — Roboutik",
  description: "Comment Roboutik traite tes données personnelles.",
};

export default function PrivacyPage() {
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
              <Shield className="size-6 text-fuchsia-600" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Politique de confidentialité
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Dernière mise à jour : juin 2026
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">1. Responsable du traitement</h2>
            <p className="text-sm text-slate-700">
              Le responsable du traitement des données est l'éditeur de Roboutik
              (voir <Link href="/legal/notices" className="text-fuchsia-600 underline">mentions légales</Link>).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">2. Données collectées</h2>
            <p className="text-sm text-slate-700">Roboutik collecte les données suivantes :</p>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li><strong>Compte Google</strong> : email, nom, photo de profil (via Google OAuth)</li>
              <li><strong>Profil Roboutik</strong> : pseudo, avatar (emoji), statut vendeur/admin, solde</li>
              <li><strong>Annonces</strong> : titre, description, prix, jeu Roblox associé</li>
              <li><strong>Commandes</strong> : montant, statut, date, vendeur et acheteur liés</li>
              <li><strong>Messages</strong> : contenu des discussions entre acheteurs et vendeurs</li>
              <li><strong>Retraits</strong> : montant, numéro Wave, statut</li>
              <li><strong>Tickets support</strong> : sujet, messages, catégorie, priorité</li>
              <li><strong>Données techniques</strong> : adresse IP (rate-limiting), user-agent</li>
              <li><strong>Journal d'audit</strong> : actions admin (ban, validation retrait, etc.)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">3. Finalités du traitement</h2>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li>Permettre l'inscription et la connexion (Google OAuth)</li>
              <li>Faciliter les transactions entre acheteurs et vendeurs</li>
              <li>Traiter les paiements Wave et valider les commandes</li>
              <li>Permettre la messagerie entre utilisateurs</li>
              <li>Traiter les demandes de retrait vendeur</li>
              <li>Fournir le support client (bot + admins)</li>
              <li>Détecter et prévenir les fraudes (rate-limiting, signalements)</li>
              <li>Respecter les obligations légales (audit, conservation)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">4. Base légale</h2>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li><strong>Consentement</strong> : inscription, messages, tickets support</li>
              <li><strong>Exécution du contrat</strong> : transactions, retraits</li>
              <li><strong>Intérêt légitime</strong> : sécurité, anti-fraude, rate-limiting</li>
              <li><strong>Obligation légale</strong> : conservation des journaux d'audit</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">5. Destinataires des données</h2>
            <p className="text-sm text-slate-700">Vos données sont accessibles :</p>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li>À vous-même (votre profil, vos commandes)</li>
              <li>Aux vendeurs concernés (vos commandes chez eux, vos messages)</li>
              <li>Aux administrateurs Roboutik (modération, support, audit)</li>
              <li>Aux prestataires techniques : Vercel (hébergement), Neon (base de données), Google (auth), Wave (paiement)</li>
            </ul>
            <p className="text-sm text-slate-700">
              Vos données ne sont jamais vendues à des tiers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">6. Durée de conservation</h2>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li><strong>Compte</strong> : jusqu'à suppression par l'utilisateur</li>
              <li><strong>Commandes</strong> : 5 ans (obligation comptable)</li>
              <li><strong>Messages</strong> : 1 an après la dernière commande liée</li>
              <li><strong>Tickets support</strong> : 2 ans</li>
              <li><strong>Journal d'audit</strong> : 5 ans</li>
              <li><strong>Données techniques (IP)</strong> : 30 jours</li>
              <li><strong>Compte banni</strong> : 3 ans (preuve en cas de litige)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">7. Vos droits</h2>
            <p className="text-sm text-slate-700">
              Conformément à la loi sénégalaise sur la protection des données (loi n° 2008-12)
              et au RGPD européen, vous disposez des droits suivants :
            </p>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li><strong>Droit d'accès</strong> : consulter vos données</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : supprimer votre compte (« droit à l'oubli »)</li>
              <li><strong>Droit à la limitation</strong> : geler le traitement</li>
              <li><strong>Droit à la portabilité</strong> : exporter vos données</li>
              <li><strong>Droit d'opposition</strong> : refuser certains traitements</li>
            </ul>
            <p className="text-sm text-slate-700">
              Pour exercer ces droits, écrivez à <a href="mailto:contact@roboutik.sn" className="text-fuchsia-600 underline">contact@roboutik.sn</a> ou
              utilisez le bouton « Supprimer mon compte » dans votre profil.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">8. Cookies</h2>
            <p className="text-sm text-slate-700">
              Roboutik utilise les cookies strictement nécessaires au fonctionnement :
            </p>
            <ul className="text-sm text-slate-700 list-disc pl-6 space-y-1">
              <li><code>__Secure-next-auth.session-token</code> : session NextAuth (connexion Google)</li>
              <li><code>__Host-next-auth.csrf-token</code> : protection CSRF NextAuth</li>
              <li><code>__Secure-next-auth.callback-url</code> : URL de retour après login</li>
            </ul>
            <p className="text-sm text-slate-700">
              Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">9. Sécurité</h2>
            <p className="text-sm text-slate-700">
              Les données sont chiffrées en transit (HTTPS/TLS) et au repos (Neon PostgreSQL).
              Les mots de passe ne sont pas stockés (auth via Google uniquement).
              L'accès admin est limité à des comptes spécifiques et tracé dans le journal d'audit.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">10. Transferts hors Sénégal</h2>
            <p className="text-sm text-slate-700">
              Les données sont hébergées par Vercel (États-Unis) et Neon (Union européenne / États-Unis).
              Ces transferts sont encadrés par les clauses contractuelles types (SCC).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">11. Réclamation</h2>
            <p className="text-sm text-slate-700">
              Pour toute réclamation, contactez-nous à <a href="mailto:contact@roboutik.sn" className="text-fuchsia-600 underline">contact@roboutik.sn</a>.
              Vous pouvez aussi saisir l'autorité de protection des données du Sénégal (CDP).
            </p>
          </section>

          <footer className="border-t pt-4 flex flex-wrap gap-3">
            <Link href="/legal/notices">
              <Button variant="outline" size="sm" className="rounded-full">
                <Scale className="size-4" />
                Mentions légales
              </Button>
            </Link>
            <Link href="/legal/terms">
              <Button variant="outline" size="sm" className="rounded-full">
                <FileText className="size-4" />
                Conditions générales
              </Button>
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
