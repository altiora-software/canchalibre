import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Términos de Servicio - Cancha Libre</title>
        <meta name="description" content="Términos y condiciones de uso de Cancha Libre - Plataforma de reserva de canchas deportivas en Jujuy." />
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
                Términos de Servicio
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Última actualización: {new Date().toLocaleDateString('es-AR')}
              </p>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <div className="space-y-6 text-foreground">
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
                  <p>
                    Al acceder y utilizar Cancha Libre, aceptas cumplir con estos términos de servicio 
                    y todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de 
                    estos términos, no debes usar nuestro servicio.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
                  <p>
                    Cancha Libre es una plataforma digital que conecta usuarios con propietarios de 
                    complejos deportivos para facilitar la reserva de canchas. Actuamos como intermediarios 
                    y no somos propietarios de las instalaciones deportivas.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">3. Registro de Usuario</h2>
                  <p>
                    Para utilizar ciertos servicios, debes registrarte y crear una cuenta. Te comprometes a:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Proporcionar información veraz y actualizada</li>
                    <li>Mantener la confidencialidad de tu cuenta</li>
                    <li>Notificar inmediatamente cualquier uso no autorizado</li>
                    <li>Ser responsable de todas las actividades en tu cuenta</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">4. Reservas y Pagos</h2>
                  <p>
                    Las reservas están sujetas a disponibilidad y confirmación por parte del propietario 
                    del complejo. Los métodos de pago y políticas de cancelación pueden variar según 
                    cada establecimiento.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">5. Conducta del Usuario</h2>
                  <p>
                    Los usuarios se comprometen a:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Usar el servicio de manera legal y apropiada</li>
                    <li>No interferir con el funcionamiento de la plataforma</li>
                    <li>Respetar las reglas de cada complejo deportivo</li>
                    <li>No realizar actividades fraudulentas o engañosas</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">6. Responsabilidades</h2>
                  <p>
                    Cancha Libre actúa como intermediario. No somos responsables por:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>La calidad o condición de las instalaciones</li>
                    <li>Disputas entre usuarios y propietarios</li>
                    <li>Lesiones o daños ocurridos en las instalaciones</li>
                    <li>Cancelaciones o cambios por parte de los propietarios</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">7. Propiedad Intelectual</h2>
                  <p>
                    Todo el contenido de la plataforma, incluyendo texto, gráficos, logos, y software, 
                    es propiedad de Cancha Libre y está protegido por leyes de propiedad intelectual.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">8. Modificaciones</h2>
                  <p>
                    Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                    Los cambios entrarán en vigor inmediatamente después de su publicación en la plataforma.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">9. Terminación</h2>
                  <p>
                    Podemos suspender o terminar tu acceso al servicio en cualquier momento, 
                    con o sin causa, con o sin aviso previo.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">10. Contacto</h2>
                  <p>
                    Para preguntas sobre estos términos de servicio, puedes contactarnos a través de 
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

export default TermsOfService;