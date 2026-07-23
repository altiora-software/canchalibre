import { ArrowRight, Building2, ChevronRight, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Search,
    title: "Elegí tus preferencias",
    description: "Seleccioná deporte, zona, fecha y horario aproximado.",
  },
  {
    icon: Building2,
    title: "Compará complejos",
    description: "Revisá ubicación, características, imágenes y horarios publicados.",
  },
  {
    icon: MessageCircle,
    title: "Contactá al complejo",
    description: "Consultá disponibilidad y confirmá el turno directamente.",
  },
];

/** Bloques de conversión y cierre de la portada pública. */
export const PublicMarketingSections = () => (
  <>
    <section aria-labelledby="how-it-works" className="container mx-auto px-4 pb-10 pt-4 md:pb-14">
      <div className="grid overflow-hidden rounded-2xl border border-emerald-100 bg-card shadow-sm lg:grid-cols-[1.16fr_.84fr]">
        <div className="px-6 py-8 sm:px-9 sm:py-9">
          <h2 id="how-it-works" className="text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">Encontrá una cancha en pocos pasos</h2>
          <ol className="mt-8 grid gap-7 sm:grid-cols-3 sm:gap-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li key={title} className="relative text-center">
                {index < steps.length - 1 && <ChevronRight aria-hidden="true" className="absolute -right-4 top-6 hidden h-5 w-5 text-emerald-500 sm:block" />}
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{index + 1}. {title}</h3>
                <p className="mx-auto mt-1.5 max-w-48 text-xs leading-5 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </div>

        <aside aria-labelledby="owner-cta" className="relative isolate overflow-hidden bg-emerald-50 px-6 py-8 sm:px-9 sm:py-9">
          <div className="absolute -bottom-12 -right-9 h-40 w-40 rotate-[-24deg] rounded-[36px] border-[10px] border-emerald-200/70 bg-emerald-600/10" aria-hidden="true" />
          <div className="absolute bottom-8 right-8 hidden h-20 w-28 rounded-lg border-4 border-white/85 bg-emerald-700/90 shadow-lg sm:block" aria-hidden="true">
            <div className="absolute inset-x-3 top-1/2 border-t border-dashed border-white/80" />
            <div className="absolute left-1/2 top-2 bottom-2 border-l border-dashed border-white/80" />
            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80" />
          </div>
          <div className="relative max-w-xs">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Para propietarios</p>
            <h2 id="owner-cta" className="mt-2 text-xl font-bold tracking-tight text-foreground">¿Tenés un complejo deportivo?</h2>
            <p className="mt-3 text-sm leading-6 text-foreground/80">Publicá tus canchas, horarios, ubicación y medios de contacto para que más jugadores puedan encontrarte.</p>
            <Button asChild className="mt-5 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"><Link to="/owners/apply">Publicá tu complejo <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </aside>
      </div>
    </section>

    <footer className="bg-emerald-950 text-emerald-50">
      <div className="container mx-auto px-4 pb-6 pt-10 sm:pt-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1.15fr_1.1fr]">
          <section aria-label="Cancha Libre">
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Cancha Libre, inicio">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">CL</span>
              <span><strong className="block text-base leading-none text-white">Cancha Libre</strong><span className="mt-1 block text-xs text-emerald-200">San Salvador de Jujuy</span></span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-emerald-100/85">Una plataforma para conectar jugadores con complejos deportivos de la ciudad.</p>
            <div className="mt-5 flex gap-3">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram de Cancha Libre" className="rounded p-1 text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"><Instagram className="h-5 w-5" /></a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook de Cancha Libre" className="rounded p-1 text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"><Facebook className="h-5 w-5" /></a>
              <a href="https://wa.me/543881234567" target="_blank" rel="noreferrer" aria-label="WhatsApp de Cancha Libre" className="rounded p-1 text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"><MessageCircle className="h-5 w-5" /></a>
            </div>
          </section>

          <nav aria-label="Explorar"><h2 className="text-sm font-semibold text-white">Explorar</h2><ul className="mt-4 space-y-3 text-sm text-emerald-100/85"><li><Link className="hover:text-white" to="/">Encontrar complejos</Link></li><li><a className="hover:text-white" href="/#results">Deportes</a></li><li><Link className="hover:text-white" to="/owners/apply">Publicá tu complejo</Link></li></ul></nav>
          <nav aria-label="Información"><h2 className="text-sm font-semibold text-white">Información</h2><ul className="mt-4 space-y-3 text-sm text-emerald-100/85"><li><a className="hover:text-white" href="/#how-it-works">Cómo funciona</a></li><li><a className="hover:text-white" href="mailto:hola@canchalibre.com.ar">Contacto</a></li><li><Link className="hover:text-white" to="/terms-of-service">Términos y condiciones</Link></li><li><Link className="hover:text-white" to="/privacy-policy">Política de privacidad</Link></li></ul></nav>
          <address className="not-italic"><h2 className="text-sm font-semibold text-white">Contacto</h2><ul className="mt-4 space-y-3 text-sm text-emerald-100/85"><li><a className="flex items-center gap-2 hover:text-white" href="https://wa.me/543881234567"><Phone className="h-4 w-4" />388 123 4567</a></li><li><a className="flex items-center gap-2 hover:text-white" href="mailto:hola@canchalibre.com.ar"><Mail className="h-4 w-4" />hola@canchalibre.com.ar</a></li><li className="flex items-center gap-2"><MapPin className="h-4 w-4" />San Salvador de Jujuy</li></ul></address>
        </div>
        <div className="mt-9 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-emerald-100/70 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Cancha Libre. Todos los derechos reservados.</p><p className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Datos y permisos protegidos.</p></div>
      </div>
    </footer>
  </>
);

export default PublicMarketingSections;
