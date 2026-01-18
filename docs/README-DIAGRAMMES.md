# Guide des Diagrammes d'Architecture

Ce dossier contient plusieurs représentations graphiques de l'architecture du système de planification et suivi intelligent du transport professionnel.

## Fichiers disponibles

### 1. architecture-globale.md (Mermaid)
Contient 10 diagrammes Mermaid interactifs :
- Architecture en couches
- Architecture technique détaillée
- Architecture de déploiement
- Flux de création de mission
- Flux de suivi GPS temps réel
- Modèle de données (ERD)
- Architecture multi-tenant
- Pipeline CI/CD
- Architecture de sécurité
- Composants du système

### 2. architecture.puml (PlantUML)
Contient 6 diagrammes UML professionnels :
- Vue d'ensemble simplifiée
- Séquence : Création de mission
- Séquence : Suivi GPS temps réel
- Déploiement
- Composants et dépendances
- Modèle de données

### 3. architecture.dot (Graphviz)
Contient 4 diagrammes orientés graphe :
- Système complet
- Déploiement
- Flux d'optimisation
- Sécurité

## Comment visualiser les diagrammes

### Option 1 : Mermaid (Recommandé pour GitHub)

#### Sur GitHub
Les diagrammes Mermaid s'affichent automatiquement dans les fichiers `.md` sur GitHub.

#### Localement avec VS Code
1. Installez l'extension "Markdown Preview Mermaid Support"
2. Ouvrez `architecture-globale.md`
3. Appuyez sur `Ctrl+Shift+V` (Aperçu Markdown)

#### En ligne
1. Allez sur https://mermaid.live/
2. Copiez-collez le code d'un diagramme
3. Exportez en PNG/SVG

### Option 2 : PlantUML

#### En ligne (Plus simple)
1. Allez sur http://www.plantuml.com/plantuml/uml/
2. Copiez-collez le contenu de `architecture.puml`
3. Le diagramme s'affiche automatiquement
4. Téléchargez en PNG/SVG

#### Avec VS Code
1. Installez l'extension "PlantUML"
2. Installez Java (requis pour PlantUML)
3. Ouvrez `architecture.puml`
4. Appuyez sur `Alt+D` pour prévisualiser

#### Ligne de commande
```bash
# Installer PlantUML
npm install -g node-plantuml

# Générer une image
puml generate architecture.puml -o architecture.png
```

### Option 3 : Graphviz (DOT)

#### En ligne
1. Allez sur https://dreampuf.github.io/GraphvizOnline/
2. Copiez-collez le contenu de `architecture.dot`
3. L'image se génère automatiquement

#### Ligne de commande
```bash
# Installer Graphviz
# Windows (avec Chocolatey):
choco install graphviz

# Ubuntu/Debian:
sudo apt-get install graphviz

# macOS:
brew install graphviz

# Générer des images
dot -Tpng architecture.dot -o architecture.png
dot -Tsvg architecture.dot -o architecture.svg
dot -Tpdf architecture.dot -o architecture.pdf
```

## Intégration dans le rapport LaTeX

Pour inclure ces diagrammes dans votre rapport LaTeX :

### Méthode 1 : Convertir en images

```bash
# Convertir Mermaid en PNG (via mermaid.live ou mmdc)
npx -p @mermaid-js/mermaid-cli mmdc -i diagram.mmd -o diagram.png

# Convertir PlantUML en PNG
java -jar plantuml.jar architecture.puml

# Convertir Graphviz en PNG
dot -Tpng architecture.dot -o architecture.png
```

Puis dans LaTeX :

```latex
\begin{figure}[H]
    \centering
    \includegraphics[width=0.9\textwidth]{docs/architecture.png}
    \caption{Architecture globale du système}
    \label{fig:architecture}
\end{figure}
```

### Méthode 2 : Utiliser TikZ dans LaTeX

Pour des diagrammes natifs LaTeX, vous pouvez les redessiner avec TikZ :

```latex
\usepackage{tikz}
\usetikzlibrary{shapes,arrows,positioning}

\begin{tikzpicture}[node distance=2cm]
    \node (ui) [rectangle, draw] {Next.js UI};
    \node (api) [rectangle, draw, below of=ui] {Server Actions};
    \node (db) [cylinder, draw, below of=api] {PostgreSQL};

    \draw [->] (ui) -- (api);
    \draw [->] (api) -- (db);
\end{tikzpicture}
```

## Recommandations d'usage

### Pour la documentation technique
- Utilisez **Mermaid** : facile à maintenir dans Git, s'affiche sur GitHub

### Pour les présentations
- Utilisez **PlantUML** : diagrammes UML professionnels et standards

### Pour les publications
- Utilisez **Graphviz** : haute qualité, export vectoriel (SVG, PDF)

### Pour le rapport LaTeX
- Convertissez en **PNG** ou **PDF** pour l'inclusion

## Diagrammes recommandés pour le rapport

Pour un rapport de 35-40 pages, incluez ces diagrammes :

1. **Architecture en couches** (page 5-10)
   - Donne une vue d'ensemble simple
   - Source : `architecture-globale.md` (Diagramme 1)

2. **Architecture de déploiement** (page 15-20)
   - Montre l'infrastructure réelle
   - Source : `architecture.puml` (Diagramme déploiement)

3. **Flux de création de mission** (page 25-30)
   - Illustre un cas d'usage concret
   - Source : `architecture.puml` (Séquence création mission)

4. **Modèle de données** (page 30-35)
   - Détaille la structure de la base
   - Source : `architecture-globale.md` (Diagramme 6 ERD)

5. **Architecture de sécurité** (page 35-40)
   - Montre les couches de protection
   - Source : `architecture-globale.md` (Diagramme 9)

## Génération automatique d'images

Script PowerShell pour Windows :

```powershell
# generate-diagrams.ps1

# Mermaid (nécessite mmdc)
npx -p @mermaid-js/mermaid-cli mmdc -i mermaid-arch.mmd -o output/arch-mermaid.png

# PlantUML (nécessite Java)
java -jar plantuml.jar architecture.puml -o output

# Graphviz
dot -Tpng architecture.dot -o output/arch-graphviz.png
dot -Tsvg architecture.dot -o output/arch-graphviz.svg
```

Script Bash pour Linux/macOS :

```bash
#!/bin/bash
# generate-diagrams.sh

mkdir -p output

# Mermaid
mmdc -i mermaid-arch.mmd -o output/arch-mermaid.png

# PlantUML
plantuml architecture.puml -o output

# Graphviz
dot -Tpng architecture.dot -o output/arch-graphviz.png
dot -Tsvg architecture.dot -o output/arch-graphviz.svg

echo "Diagrammes générés dans le dossier output/"
```

## Personnalisation

### Mermaid
Modifier les couleurs dans le code :

```mermaid
style UI fill:#4CAF50
style API fill:#2196F3
```

### PlantUML
Utiliser les skinparams :

```plantuml
skinparam BackgroundColor lightblue
skinparam componentStyle rectangle
```

### Graphviz
Changer les attributs des nœuds :

```dot
node [fillcolor=lightblue, style=filled]
```

## Support et ressources

- **Mermaid** : https://mermaid.js.org/
- **PlantUML** : https://plantuml.com/
- **Graphviz** : https://graphviz.org/
- **TikZ** : https://tikz.dev/

## Contribution

Pour ajouter un nouveau diagramme :

1. Créez le diagramme dans le format approprié
2. Ajoutez-le à ce README
3. Générez l'image de prévisualisation
4. Commitez les deux fichiers (source + image)
