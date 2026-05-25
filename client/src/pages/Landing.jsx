import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, CalendarCheck, Users, ArrowRight,
  UserCircle, MapPin, ChevronRight, Building2,
} from 'lucide-react';
import { useAuth, homeFor } from '@/App';
import { listFeaturedClubs } from '@/api/clubs';

function priceRange(min, max) {
  if (min == null && max == null) return null;
  const fmt = (v) => `${Number(v).toLocaleString('fr-FR')} FCFA`;
  if (min === max || max == null) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

// ── Logo mark ─────────────────────────────────────────────────────────────────
function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
        <span className="text-white font-bold text-sm">P</span>
      </div>
      <span className={`text-lg font-bold tracking-tight select-none ${light ? 'text-white' : 'text-foreground'}`}>
        Padel<span className={light ? 'text-primary/70' : 'text-primary'}>Connect</span>
      </span>
    </Link>
  );
}

// ── Landing hero nav ──────────────────────────────────────────────────────────
function HeroNav({ user }) {
  return (
    <nav className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 sm:px-12 py-5">
      <Logo light />
      <div className="flex items-center gap-3">
        {user ? (
          <Link
            to={homeFor(user)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors backdrop-blur-sm border border-white/20"
          >
            Mon espace <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Se connecter
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-lg bg-white text-[#1A3D2B] text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm"
            >
              S'inscrire
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection({ user }) {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#0d2818]">
      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f12] via-[#1A3D2B] to-[#0d2818]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Decorative court grid (bottom) */}
      <div
        className="absolute bottom-0 inset-x-0 h-48 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
        }}
      />

      {/* Decorative glow circles */}
      <div className="absolute top-1/3 right-[-10%] w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-[-5%] w-64 h-64 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />

      <HeroNav user={user} />

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12 pt-24 pb-20">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-8 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          Matching IA · Réservation instantanée · Abidjan
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight max-w-4xl">
          Trouvez vos partenaires
          <br />
          <span className="text-emerald-400">de padel à Abidjan</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl leading-relaxed">
          L'IA analyse votre jeu pour matcher les meilleurs partenaires.
          Réservez un terrain en quelques clics.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          {user ? (
            <Link
              to={homeFor(user)}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#1A3D2B] font-semibold text-base hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Mon espace
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#1A3D2B] font-semibold text-base hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            to="/clubs"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 text-white font-medium text-base hover:bg-white/20 transition-all border border-white/20 backdrop-blur-sm"
          >
            Voir les clubs
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-white/40 text-sm">
          Rejoignez la communauté padel d'Abidjan — inscription gratuite
        </p>
      </div>

      {/* Bottom scroll hint */}
      <div className="relative z-10 flex justify-center pb-8">
        <div className="flex flex-col items-center gap-1 opacity-40">
          <div className="w-px h-8 bg-white/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Sparkles,
    title: 'Matching IA',
    desc: 'Décrivez votre jeu, l\'IA trouve vos partenaires idéaux. Plus besoin de chercher dans des groupes WhatsApp.',
    color: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    Icon: CalendarCheck,
    title: 'Réservation express',
    desc: 'Réservez un terrain en quelques clics, payez sur place ou en ligne. Annulation gratuite jusqu\'à 4h avant.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    Icon: Users,
    title: 'Communauté',
    desc: 'Rejoignez la communauté padel d\'Abidjan. Sessions ouvertes, matchs amicaux, tournois — tout en un.',
    color: 'bg-amber-50 text-amber-700 border-amber-100',
  },
];

function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-12">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Pourquoi PadelConnect</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A3D2B] tracking-tight">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Une plateforme pensée pour les joueurs de padel d'Abidjan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map(({ Icon, title, desc, color }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-[#FAF8F5] p-8 space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A3D2B]">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    Icon: UserCircle,
    title: 'Créez votre profil',
    desc: 'Inscription gratuite. Décrivez votre niveau, vos disponibilités et votre style de jeu en 2 minutes.',
  },
  {
    n: '02',
    Icon: Sparkles,
    title: 'Trouvez une session',
    desc: 'L\'IA analyse votre profil et vous propose les meilleures sessions avec des joueurs compatibles.',
  },
  {
    n: '03',
    Icon: CalendarCheck,
    title: 'Réservez et jouez',
    desc: 'Confirmez votre place, réservez le terrain. Plus qu\'à venir jouer !',
  },
];

function HowItWorksSection() {
  const { user } = useAuth();
  return (
    <section className="py-24 bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-6 sm:px-12">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Comment ça marche</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A3D2B] tracking-tight">
            Prêt à jouer en 3 étapes
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-border z-0" />

          {STEPS.map(({ n, Icon, title, desc }) => (
            <div key={n} className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-[#1A3D2B] flex flex-col items-center justify-center shadow-md shrink-0">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">{n}</span>
                <Icon className="h-6 w-6 text-white mt-1" />
              </div>
              <h3 className="text-base font-semibold text-[#1A3D2B]">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          {user ? (
            <Link
              to={homeFor(user)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#1A3D2B] text-white font-semibold hover:bg-[#1A3D2B]/90 transition-all shadow-sm"
            >
              Mon espace
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#1A3D2B] text-white font-semibold hover:bg-[#1A3D2B]/90 transition-all shadow-sm"
            >
              Créer mon compte gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Clubs ─────────────────────────────────────────────────────────────────────
function ClubCard({ club }) {
  const price = priceRange(club.min_price, club.max_price);
  const initials = club.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {/* Cover / logo area */}
      <div className="h-36 bg-gradient-to-br from-[#1A3D2B] to-[#0d2818] flex items-center justify-center relative">
        {club.cover_url ? (
          <img src={club.cover_url} alt={club.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-bold text-white/20 select-none">{initials}</span>
        )}
        {club.logo_url && (
          <img
            src={club.logo_url}
            alt=""
            className="absolute bottom-3 left-4 h-10 w-10 rounded-lg border-2 border-white object-cover bg-white"
          />
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-[#1A3D2B] text-base">{club.name}</h3>
        {club.address && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />{club.address}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {club.venue_count ?? 0} terrain{club.venue_count !== 1 ? 's' : ''}
          </span>
          {price && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
              {price}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <Link
          to={`/clubs/${club.id}`}
          className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg border border-border text-sm font-medium text-[#1A3D2B] hover:bg-[#1A3D2B] hover:text-white transition-all"
        >
          Voir le club <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function ClubsSection() {
  const [clubs,   setClubs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFeaturedClubs()
      .then(({ clubs: c }) => setClubs((c ?? []).slice(0, 3)))
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-12">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Nos partenaires</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A3D2B] tracking-tight">
              Clubs partenaires
            </h2>
            <p className="mt-3 text-muted-foreground">
              Les meilleurs clubs de padel d'Abidjan, tous disponibles sur PadelConnect.
            </p>
          </div>
          <Link
            to="/clubs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Voir tous les clubs <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <div className="h-36 bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-9 rounded-lg bg-muted animate-pulse mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-[#FAF8F5] p-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Les clubs arrivent bientôt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {clubs.map((club) => <ClubCard key={club.id} club={club} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { user } = useAuth();
  return (
    <footer className="bg-[#0d2818] text-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-14">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Logo light />
            <p className="text-sm text-white/50 max-w-xs">
              La plateforme de padel d'Abidjan. Matchs, réservations et communauté.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Jouer</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link to="/sessions" className="hover:text-white transition-colors">Sessions</Link></li>
                <li><Link to="/clubs"    className="hover:text-white transition-colors">Clubs</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Compte</p>
              <ul className="space-y-2 text-sm text-white/60">
                {user ? (
                  <li>
                    <Link to={homeFor(user)} className="hover:text-white transition-colors">
                      Mon espace
                    </Link>
                  </li>
                ) : (
                  <>
                    <li><Link to="/signup" className="hover:text-white transition-colors">Inscription</Link></li>
                    <li><Link to="/login"  className="hover:text-white transition-colors">Connexion</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Support</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link to="/contact" className="hover:text-white transition-colors">Nous contacter</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Confidentialité</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span>© 2026 PadelConnect — Abidjan</span>
          <span>Fait avec ❤️ pour la communauté padel ivoirienne</span>
        </div>
      </div>
    </footer>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <HeroSection user={user} />
      <FeaturesSection />
      <HowItWorksSection />
      <ClubsSection />
      <Footer />
    </div>
  );
}
