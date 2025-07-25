import type { MetaFunction } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export const meta: MetaFunction = () => {
  return [
    { title: "MCP V2 - Simple Architecture" },
    { name: "description", content: "Interface simple et efficace pour MCP" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MCP V2 - Architecture Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Complexité réduite, efficacité maximale
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 MCP Server
              </CardTitle>
              <CardDescription>
                Serveur Fastify avec Supabase + Redis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Point d'entrée unique pour toutes les données
              </p>
              <Button variant="outline" className="w-full">
                Voir les endpoints
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💻 Interface Web
              </CardTitle>
              <CardDescription>
                Remix avec Shadcn UI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Interface utilisateur moderne et réactive
              </p>
              <Button variant="outline" className="w-full">
                Explorer l'app
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ API Backend
              </CardTitle>
              <CardDescription>
                NestJS pour la logique métier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Services robustes et scalables
              </p>
              <Button variant="outline" className="w-full">
                Documentation API
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🎯 Avantages de l'Architecture V2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">✅ Simplicité</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• 3 dossiers au lieu de 15+ packages</li>
                  <li>• Configuration unifiée</li>
                  <li>• Scripts de développement intégrés</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-700 mb-2">⚡ Performance</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Stack complète préservée</li>
                  <li>• Types partagés automatiques</li>
                  <li>• Cache Redis optimisé</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button size="lg" className="mr-4">
            Démarrer le développement
          </Button>
          <Button variant="outline" size="lg">
            Voir la documentation
          </Button>
        </div>
      </div>
    </div>
  );
}
