import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CoverageChart } from '@/components/admin/CoverageChart';
import { ReliabilityPieChart } from '@/components/admin/ReliabilityPieChart';
import { ChurchesMap } from '@/components/admin/ChurchesMap';
import { ChurchesTable } from '@/components/admin/ChurchesTable';
import { 
  Church, 
  MapPin, 
  Calendar, 
  Phone, 
  Radio, 
  Download,
  RefreshCw,
  Map as MapIcon,
  Trash2,
  ArrowLeft
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface AdminStats {
  timestamp: string;
  total: number;
  active: number;
  coverage: {
    gps: { count: number; percent: number };
    schedules: { count: number; percent: number };
    phone: { count: number; percent: number };
    website: { count: number; percent: number };
    photos: { count: number; percent: number };
  };
  avgSchedulesPerChurch: number;
  avgReliabilityScore: number;
  reliabilityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  recentlyUpdated: any[];
}

interface ChurchMapData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  schedulesCount: number;
  phone: string | null;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [mapData, setMapData] = useState<ChurchMapData[]>([]);
  const [allChurches, setAllChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/admin/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);
      
      // Fetch map data
      const mapRes = await fetch(`${API_BASE}/admin/churches-map`);
      const mapDataRes = await mapRes.json();
      setMapData(mapDataRes.data);
      
      // Fetch all churches for table
      const churchesRes = await fetch(`${API_BASE}/churches?limit=500`);
      const churchesData = await churchesRes.json();
      setAllChurches(churchesData.data);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleScrape = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/scrape`, {
        method: 'POST'
      });
      const data = await res.json();
      console.log('Scrape triggered:', data);
      alert('Scraping lancé avec succès !');
    } catch (error) {
      console.error('Error triggering scrape:', error);
      alert('Erreur lors du lancement du scraping');
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Church className="h-8 w-8 text-primary" />
                  God's Plan - Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitoring & Analytics
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="relative">
                  <Radio className="h-4 w-4 text-green-500" />
                  <div className="absolute inset-0 animate-ping">
                    <Radio className="h-4 w-4 text-green-500 opacity-75" />
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">Live</span>
              </div>
              
              {/* Last update */}
              {lastUpdate && (
                <p className="text-sm text-muted-foreground">
                  Mis à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
                </p>
              )}
              
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Églises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.active} actives
                  </p>
                </div>
                <Church className="h-12 w-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Coordonnées GPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.coverage.gps.percent}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.coverage.gps.count} / {stats.total}
                  </p>
                </div>
                <MapPin className="h-12 w-12 text-green-500/20" />
              </div>
              {stats.coverage.gps.percent === 100 && (
                <Badge className="mt-2 bg-green-500">Complet ✅</Badge>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horaires de messes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.coverage.schedules.percent}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.coverage.schedules.count} / {stats.total}
                  </p>
                </div>
                <Calendar className="h-12 w-12 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contacts téléphone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.coverage.phone.percent}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.coverage.phone.count} / {stats.total}
                  </p>
                </div>
                <Phone className="h-12 w-12 text-purple-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Coverage des données</CardTitle>
              <CardDescription>Pourcentage de completion par type</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <CoverageChart coverage={stats.coverage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scores de fiabilité</CardTitle>
              <CardDescription>Distribution des églises par qualité</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ReliabilityPieChart distribution={stats.reliabilityDistribution} />
            </CardContent>
          </Card>
        </div>

        {/* Map Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              Carte des églises de Paris
            </CardTitle>
            <CardDescription>
              {mapData.length} églises géolocalisées • Code couleur : 
              <span className="ml-2 text-green-600 font-semibold">Vert (&gt;80)</span>
              <span className="ml-2 text-yellow-600 font-semibold">Orange (50-80)</span>
              <span className="ml-2 text-red-600 font-semibold">Rouge (&lt;50)</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            <ChurchesMap churches={mapData} />
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions administrateur</CardTitle>
            <CardDescription>Outils de gestion et maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button onClick={handleScrape} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Lancer scraping complet
              </Button>
              
              <Button variant="outline" className="w-full" disabled>
                <MapPin className="mr-2 h-4 w-4" />
                Enrichir avec Google Maps
                <Badge variant="secondary" className="ml-2">10/208</Badge>
              </Button>
              
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                Générer rapport qualité
              </Button>
              
              <Button variant="outline" className="w-full text-destructive" disabled>
                <Trash2 className="mr-2 h-4 w-4" />
                Nettoyer données obsolètes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Churches Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des églises</CardTitle>
            <CardDescription>
              {allChurches.length} églises • Cliquez sur les en-têtes pour trier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChurchesTable 
              churches={allChurches}
              onViewDetails={(id) => {
                window.open(`/?church=${id}`, '_blank');
              }}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
