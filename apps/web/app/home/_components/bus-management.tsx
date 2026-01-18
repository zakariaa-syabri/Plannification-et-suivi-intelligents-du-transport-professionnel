'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Badge } from '@kit/ui/badge';

interface Bus {
  id: string;
  numero_bus: string;
  immatriculation: string;
  capacite: number;
  type_bus: string;
  statut: string;
  ecole_id: string;
  ecole_nom?: string;
}

interface School {
  id: string;
  nom: string;
}

export function BusManagement() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [newBus, setNewBus] = useState<Omit<Bus, 'id'>>({
    numero_bus: '',
    immatriculation: '',
    capacite: 0,
    type_bus: 'Standard',
    statut: 'disponible',
    ecole_id: '',
  });

  useEffect(() => {
    fetchBuses();
    fetchSchools();
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bus');
      if (response.ok) {
        const data = await response.json();
        setBuses(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des bus:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ecoles');
      if (response.ok) {
        const data = await response.json();
        setSchools(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des écoles:', error);
    }
  };

  const filteredBuses =
    selectedSchool === 'all'
      ? buses
      : buses.filter((b) => b.ecole_id === selectedSchool);

  const handleAddBus = async () => {
    setSubmitting(true);
    try {
      // Convertir les chaînes vides en null pour les champs UUID
      const busData = {
        ...newBus,
        ecole_id: newBus.ecole_id || null,
      };

      const response = await fetch('http://localhost:8000/api/bus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(busData),
      });

      if (response.ok) {
        await fetchBuses();
        setIsAddDialogOpen(false);
        setNewBus({
          numero_bus: '',
          immatriculation: '',
          capacite: 0,
          type_bus: 'Standard',
          statut: 'disponible',
          ecole_id: '',
        });
      } else {
        console.error('Erreur lors de l\'ajout du bus');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (statut: string) => {
    switch (statut.toLowerCase()) {
      case 'en service':
        return 'default';
      case 'disponible':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des Bus</CardTitle>
            <CardDescription>
              Liste des bus par école
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrer par école" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les écoles</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un bus
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau bus</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations du bus
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero_bus">Numéro du bus</Label>
                      <Input
                        id="numero_bus"
                        placeholder="Bus #XX"
                        value={newBus.numero_bus}
                        onChange={(e) =>
                          setNewBus({ ...newBus, numero_bus: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="immatriculation">Immatriculation</Label>
                      <Input
                        id="immatriculation"
                        placeholder="ABC-123-XY"
                        value={newBus.immatriculation}
                        onChange={(e) =>
                          setNewBus({
                            ...newBus,
                            immatriculation: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacite">Capacité</Label>
                      <Input
                        id="capacite"
                        type="number"
                        value={newBus.capacite}
                        onChange={(e) =>
                          setNewBus({
                            ...newBus,
                            capacite: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type_bus">Type de bus</Label>
                      <Select
                        value={newBus.type_bus}
                        onValueChange={(value) =>
                          setNewBus({ ...newBus, type_bus: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Climatisé">Climatisé</SelectItem>
                          <SelectItem value="Accessible">Accessible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="statut">Statut</Label>
                      <Select
                        value={newBus.statut}
                        onValueChange={(value) =>
                          setNewBus({ ...newBus, statut: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Disponible">Disponible</SelectItem>
                          <SelectItem value="En service">
                            En service
                          </SelectItem>
                          <SelectItem value="Maintenance">
                            Maintenance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ecole">École</Label>
                      <Select
                        value={newBus.ecole_id}
                        onValueChange={(value) =>
                          setNewBus({ ...newBus, ecole_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une école" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleAddBus} disabled={submitting}>
                    {submitting ? 'Ajout...' : 'Ajouter'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Capacité</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>École</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBuses.map((bus) => (
              <TableRow key={bus.id}>
                <TableCell className="font-medium">{bus.numero_bus}</TableCell>
                <TableCell>{bus.immatriculation}</TableCell>
                <TableCell>{bus.capacite}</TableCell>
                <TableCell>{bus.type_bus}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(bus.statut)}>
                    {bus.statut}
                  </Badge>
                </TableCell>
                <TableCell>{bus.ecole_nom || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
