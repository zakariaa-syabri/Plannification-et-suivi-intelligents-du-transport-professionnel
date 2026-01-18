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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

interface School {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  code_postal: string;
  telephone: string;
  email: string;
  directeur: string;
  nombre_etudiants: number;
}

export function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSchool, setNewSchool] = useState<Omit<School, 'id'>>({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    telephone: '',
    email: '',
    directeur: '',
    nombre_etudiants: 0,
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ecoles');
      if (response.ok) {
        const data = await response.json();
        setSchools(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des écoles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/ecoles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchool),
      });

      if (response.ok) {
        await fetchSchools();
        setIsAddDialogOpen(false);
        setNewSchool({
          nom: '',
          adresse: '',
          ville: '',
          code_postal: '',
          telephone: '',
          email: '',
          directeur: '',
          nombre_etudiants: 0,
        });
      } else {
        console.error('Erreur lors de l\'ajout de l\'école');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestion des Écoles</CardTitle>
            <CardDescription>
              Liste de toutes les écoles enregistrées
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une école
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle école</DialogTitle>
                <DialogDescription>
                  Remplissez les informations de l&apos;école
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom de l&apos;école</Label>
                    <Input
                      id="nom"
                      value={newSchool.nom}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, nom: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directeur">Directeur</Label>
                    <Input
                      id="directeur"
                      value={newSchool.directeur}
                      onChange={(e) =>
                        setNewSchool({
                          ...newSchool,
                          directeur: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={newSchool.adresse}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, adresse: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      value={newSchool.ville}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, ville: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      value={newSchool.code_postal}
                      onChange={(e) =>
                        setNewSchool({
                          ...newSchool,
                          code_postal: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={newSchool.telephone}
                      onChange={(e) =>
                        setNewSchool({
                          ...newSchool,
                          telephone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSchool.email}
                      onChange={(e) =>
                        setNewSchool({ ...newSchool, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre_etudiants">
                    Nombre d&apos;étudiants
                  </Label>
                  <Input
                    id="nombre_etudiants"
                    type="number"
                    value={newSchool.nombre_etudiants}
                    onChange={(e) =>
                      setNewSchool({
                        ...newSchool,
                        nombre_etudiants: parseInt(e.target.value) || 0,
                      })
                    }
                  />
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
                <Button onClick={handleAddSchool} disabled={submitting}>
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Directeur</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Étudiants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.nom}</TableCell>
                <TableCell>{school.directeur}</TableCell>
                <TableCell>{school.ville}</TableCell>
                <TableCell>{school.telephone}</TableCell>
                <TableCell>{school.email}</TableCell>
                <TableCell>{school.nombre_etudiants}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
