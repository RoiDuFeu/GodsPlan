import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, ExternalLink, RefreshCw } from 'lucide-react';

interface Church {
  id: string;
  name: string;
  reliabilityScore: number;
  latitude: number | null;
  longitude: number | null;
  massSchedules: any[];
  contact: {
    phone?: string;
    website?: string;
  };
  photos: string[];
}

interface ChurchesTableProps {
  churches: Church[];
  onViewDetails: (churchId: string) => void;
}

type SortField = 'name' | 'score';
type SortDirection = 'asc' | 'desc';

export function ChurchesTable({ churches, onViewDetails }: ChurchesTableProps) {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedChurches = useMemo(() => {
    return [...churches].sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        aVal = a.reliabilityScore;
        bVal = b.reliabilityScore;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [churches, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-blue-500">Bon</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500">Moyen</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort('name')}
                className="h-8 px-2"
              >
                Nom
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSort('score')}
                className="h-8 px-2"
              >
                Score
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-center">GPS</TableHead>
            <TableHead className="text-center">Horaires</TableHead>
            <TableHead className="text-center">Téléphone</TableHead>
            <TableHead className="text-center">Site</TableHead>
            <TableHead className="text-center">Photos</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedChurches.map((church) => (
            <TableRow key={church.id}>
              <TableCell className="font-medium max-w-xs truncate">
                {church.name}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getScoreBadge(church.reliabilityScore)}
                  <span className="text-sm text-muted-foreground">
                    {church.reliabilityScore.toFixed(1)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {church.latitude && church.longitude ? '✅' : '❌'}
              </TableCell>
              <TableCell className="text-center">
                {church.massSchedules?.length > 0 ? (
                  <span className="text-green-600 font-semibold">
                    {church.massSchedules.length}
                  </span>
                ) : (
                  '❌'
                )}
              </TableCell>
              <TableCell className="text-center">
                {church.contact?.phone ? '✅' : '❌'}
              </TableCell>
              <TableCell className="text-center">
                {church.contact?.website ? '✅' : '❌'}
              </TableCell>
              <TableCell className="text-center">
                {church.photos?.length > 0 ? (
                  <span className="text-green-600 font-semibold">
                    {church.photos.length}
                  </span>
                ) : (
                  '❌'
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(church.id)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement re-scrape
                      console.log('Re-scrape:', church.id);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
