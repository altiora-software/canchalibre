import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Política de Privacidad - Canchas Jujuy</title>
        <meta name="description" content="Política de privacidad de Canchas Jujuy - Cómo protegemos y utilizamos tus datos personales." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </div>

          <Card className="shadow-card-custom border-0">
            <CardHeader>
              <CardTitle className="text-3xl text-center text-foreground">
                Política de Privacidad
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Última actualización: {new Date().toLocaleDateString('es-AR')}
              </p>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <div className="space-y-6 text-foreground">
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Información que Recopilamos</h2>
                  <p>
                    En Canchas Jujuy recopilamos la siguiente información:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Información de contacto (nombre, email, teléfono)</li>
                    <li>Información de ubicación para mostrar complejos cercanos</li>
                    <li>Datos de reservas y preferencias de usuario</li>
                    <li>Información técnica sobre el uso de la plataforma</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">2. Cómo Utilizamos tu Información</h2>
                  <p>
                    Utilizamos tu información personal para:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Facilitar las reservas de canchas deportivas</li>
                    <li>Comunicarnos contigo sobre tus reservas</li>
                    <li>Mejorar nuestros servicios y experiencia de usuario</li>
                    <li>Cumplir con obligaciones legales</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">3. Compartir Información</h2>
                  <p>
                    No vendemos, intercambiamos o transferimos tu información personal a terceros, excepto:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Con propietarios de complejos para procesar reservas</li>
                    <li>Cuando sea requerido por ley</li>
                    <li>Para proteger nuestros derechos o la seguridad de otros usuarios</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">4. Seguridad de Datos</h2>
                  <p>
                    Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger 
                    tu información personal contra acceso no autorizado, alteración, divulgación o destrucción.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">5. Tus Derechos</h2>
                  <p>
                    Tienes derecho a:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Acceder a tu información personal</li>
                    <li>Corregir datos inexactos</li>
                    <li>Solicitar la eliminación de tus datos</li>
                    <li>Retirar tu consentimiento en cualquier momento</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">6. Cookies y Tecnologías Similares</h2>
                  <p>
                    Utilizamos cookies y tecnologías similares para mejorar tu experiencia, 
                    recordar tus preferencias y analizar el uso de nuestro sitio.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">7. Contacto</h2>
                  <p>
                    Si tienes preguntas sobre esta política de privacidad, puedes contactarnos a través de 
                    los medios proporcionados en nuestra plataforma.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;