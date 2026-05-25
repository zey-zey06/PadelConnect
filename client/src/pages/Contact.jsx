import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendContactMessage } from '@/api/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  function handle(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendContactMessage(form);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Accueil</span>
        </Link>
        <span className="text-border">·</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-foreground text-sm">PadelConnect</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nous contacter</h1>
            <p className="text-sm text-muted-foreground">
              Une question, un problème ou une suggestion ? Notre équipe vous répond sous 24h.
            </p>
          </div>

          {done ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="text-base font-semibold text-green-800">Message envoyé !</p>
              <p className="text-sm text-green-700">
                Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => { setDone(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
              >
                Envoyer un autre message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handle}
                    placeholder="Kofi Mensah"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handle}
                    placeholder="vous@exemple.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handle}
                  placeholder="ex : Problème de réservation, Question sur mon compte…"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handle}
                  placeholder="Décrivez votre problème ou votre question en détail…"
                  required
                  rows={5}
                  className={inputClass + ' resize-none'}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Informations de contact</p>
            <p>📧 support@padelconnect.ci</p>
            <p>📍 Abidjan, Côte d'Ivoire</p>
            <p>🕐 Réponse sous 24h (jours ouvrés)</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 PadelConnect ·{' '}
        <Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
      </div>
    </div>
  );
}
