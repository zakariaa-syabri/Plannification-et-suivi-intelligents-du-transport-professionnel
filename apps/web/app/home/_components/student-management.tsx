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

interface Student {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse_complete: string;
  ville: string;
  date_naissance: string;
  ecole_id: string;
  ecole_nom?: string;
}

interface School {
  id: string;
  nom: string;
}

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse_complete: '',
    ville: '',
    date_naissance: '',
    ecole_id: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchSchools();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/passagers');
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants:', error);
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

  const filteredStudents =
    selectedSchool === 'all'
      ? students
      : students.filter((s) => s.ecole_id === selectedSchool);

  const handleAddStudent = async () => {
    setSubmitting(true);
    try {
      // Convertir les chaînes vides en null pour les champs UUID
      const studentData = {
        ...newStudent,
        ecole_id: newStudent.ecole_id || null,
      };

      const response = await fetch('http://localhost:8000/api/passagers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      if (response.ok) {
        await fetchStudents();
        setIsAddDialogOpen(false);
        setNewStudent({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          adresse_complete: '',
          ville: '',
          date_naissance: '',
          ecole_id: '',
        });
      } else {
        console.error('Erreur lors de l\'ajout de l\'étudiant');
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
            <CardTitle>Gestion des Étudiants</CardTitle>
            <CardDescription>
              Liste des étudiants par école
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
                  Ajouter un étudiant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel étudiant</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations de l&apos;étudiant
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        value={newStudent.nom}
                        onChange={(e) =>
                          setNewStudent({ ...newStudent, nom: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        value={newStudent.prenom}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            prenom: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newStudent.email}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        value={newStudent.telephone}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            telephone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse complète</Label>
                    <Input
                      id="adresse"
                      value={newStudent.adresse_complete}
                      onChange={(e) =>
                        setNewStudent({
                          ...newStudent,
                          adresse_complete: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ville">Ville</Label>
                      <Input
                        id="ville"
                        value={newStudent.ville}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            ville: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_naissance">Date de naissance</Label>
                      <Input
                        id="date_naissance"
                        type="date"
                        value={newStudent.date_naissance}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            date_naissance: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ecole">École</Label>
                    <Select
                      value={newStudent.ecole_id}
                      onValueChange={(value) =>
                        setNewStudent({ ...newStudent, ecole_id: value })
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
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleAddStudent} disabled={submitting}>
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
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>École</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.nom}</TableCell>
                <TableCell>{student.prenom}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.telephone}</TableCell>
                <TableCell>{student.ville}</TableCell>
                <TableCell>{student.ecole_nom || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
