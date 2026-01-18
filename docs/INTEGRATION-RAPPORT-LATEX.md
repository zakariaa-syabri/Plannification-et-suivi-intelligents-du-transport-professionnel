# Intégration des Diagrammes dans le Rapport LaTeX

Ce guide explique comment ajouter les diagrammes d'architecture dans le rapport LaTeX `rapport_projet_transport.tex`.

## Méthode 1 : Utiliser des images PNG/PDF (Recommandé)

### Étape 1 : Générer les images

Choisissez un outil et générez les images :

#### Option A : Mermaid CLI
```bash
# Installer mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Créer un fichier .mmd pour chaque diagramme
# Copier le code Mermaid de architecture-globale.md

# Générer l'image
mmdc -i architecture-couches.mmd -o images/arch-couches.png -w 1920 -H 1080
```

#### Option B : PlantUML
```bash
# Avec Java installé
java -jar plantuml.jar architecture.puml -tpng -o ../images/

# Ou en ligne sur http://www.plantuml.com/plantuml/
# Télécharger en PNG
```

#### Option C : Graphviz
```bash
dot -Tpng architecture.dot -o images/arch-system.png
dot -Tpdf architecture.dot -o images/arch-system.pdf
```

### Étape 2 : Créer le dossier images

```bash
cd C:\Users\zakariya\nextjs-saas-starter-kit-lite-main
mkdir images
```

### Étape 3 : Modifier le rapport LaTeX

Ouvrez `rapport_projet_transport.tex` et ajoutez après le chapitre 6 section "Vue d'ensemble de l'architecture" :

```latex
\subsection{Architecture en couches}

L'application est structurée selon une architecture en couches classique séparant présentation, métier et données.

\begin{figure}[H]
    \centering
    \includegraphics[width=0.95\textwidth]{images/arch-couches.png}
    \caption{Architecture en couches du système}
    \label{fig:arch-couches}
\end{figure}

La figure \ref{fig:arch-couches} illustre la séparation en trois couches principales...
```

## Emplacements recommandés pour chaque diagramme

### Chapitre 6 : Architecture Globale et Pipeline

#### Section 6.1 - Vue d'ensemble
```latex
\section{Vue d'ensemble de l'architecture}

\begin{figure}[H]
    \centering
    \includegraphics[width=0.9\textwidth]{images/arch-system.png}
    \caption{Architecture globale du système}
    \label{fig:arch-global}
\end{figure}

Le système adopte une architecture microservices modulaire...
```

#### Section 6.2 - Modèle de données
```latex
\subsection{Schéma relationnel principal}

\begin{figure}[H]
    \centering
    \includegraphics[width=\textwidth]{images/modele-donnees.png}
    \caption{Modèle de données - Relations principales}
    \label{fig:erd}
\end{figure}

La base de données est organisée autour de l'entité centrale \texttt{organizations}...
```

#### Section 6.3 - Flux de données
```latex
\subsection{Workflow d'optimisation de route}

\begin{figure}[H]
    \centering
    \includegraphics[width=0.85\textwidth]{images/flux-optimisation.png}
    \caption{Séquence d'optimisation d'une tournée}
    \label{fig:flux-optim}
\end{figure}

Comme illustré en figure \ref{fig:flux-optim}, le processus d'optimisation...
```

```latex
\subsection{Workflow de suivi GPS en temps réel}

\begin{figure}[H]
    \centering
    \includegraphics[width=0.9\textwidth]{images/flux-gps.png}
    \caption{Flux de données GPS en temps réel}
    \label{fig:flux-gps}
\end{figure}
```

#### Section 6.4 - Pipeline de déploiement
```latex
\subsection{Déploiement production}

\begin{figure}[H]
    \centering
    \includegraphics[width=0.95\textwidth]{images/arch-deployment.png}
    \caption{Architecture de déploiement en production}
    \label{fig:deployment}
\end{figure}
```

#### Section 6.5 - Architecture de sécurité
```latex
\section{Architecture de sécurité}

\begin{figure}[H]
    \centering
    \includegraphics[width=0.7\textwidth]{images/arch-security.png}
    \caption{Couches de sécurité du système}
    \label{fig:security}
\end{figure}
```

## Méthode 2 : Utiliser TikZ directement dans LaTeX

### Étape 1 : Ajouter le package dans le préambule

Dans `rapport_projet_transport.tex`, ajoutez après les autres packages :

```latex
\usepackage{tikz}
\usetikzlibrary{shapes,arrows,positioning,fit,backgrounds,calc,shadows}
\usetikzlibrary{shapes.geometric} % pour les clouds
```

### Étape 2 : Copier le code TikZ

Ouvrez `architecture-tikz.tex` et copiez le code TikZ souhaité.

### Exemple : Architecture en couches

```latex
\subsection{Architecture en couches}

\begin{figure}[H]
\centering
\begin{tikzpicture}[
    layer/.style={rectangle, draw, fill=blue!20, text width=8cm, text centered, rounded corners, minimum height=2cm},
    component/.style={rectangle, draw, fill=white, text width=3cm, text centered, rounded corners, minimum height=1cm},
    arrow/.style={thick,->,>=stealth}
]
    % Couche Présentation
    \node[layer] (pres) at (0,8) {Couche Présentation};
    \node[component] (nextjs) at (-3,6) {Next.js\\Frontend};
    \node[component] (map) at (0,6) {Map\\Builder};
    \node[component] (driver) at (3,6) {Driver\\Dashboard};

    % Couche Métier
    \node[layer] (metier) at (0,4) {Couche Métier};
    \node[component] (sa) at (-3,2) {Server\\Actions};
    \node[component] (fastapi) at (0,2) {FastAPI\\Service};
    \node[component] (auth) at (3,2) {Supabase\\Auth};

    % Couche Données
    \node[layer] (data) at (0,0) {Couche Données};
    \node[component, fill=orange!30] (db) at (-2,-2) {PostgreSQL};
    \node[component, fill=orange!30] (redis) at (1,-2) {Redis\\Cache};
    \node[component, fill=orange!30] (mqtt) at (4,-2) {MQTT\\Broker};

    % Flèches
    \draw[arrow] (nextjs) -- (sa);
    \draw[arrow] (map) -- (sa);
    \draw[arrow] (driver) -- (sa);
    \draw[arrow] (nextjs) -- (auth);
    \draw[arrow] (sa) -- (db);
    \draw[arrow] (sa) -- (fastapi);
    \draw[arrow] (fastapi) -- (db);
    \draw[arrow] (auth) -- (db);
    \draw[arrow] (db) -- (redis);
    \draw[arrow, dashed] (driver) to[bend right=30] (mqtt);
\end{tikzpicture}
\caption{Architecture en couches du système}
\label{fig:arch-couches-tikz}
\end{figure}
```

## Méthode 3 : Combiner code SQL et diagrammes

Pour la section modèle de données, combinez le code SQL existant avec un diagramme :

```latex
\subsection{Schéma relationnel principal}

Le système utilise PostgreSQL avec les tables principales suivantes :

\subsubsection{Table organizations}

\begin{lstlisting}[language=SQL]
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
\end{lstlisting}

\begin{figure}[H]
    \centering
    \includegraphics[width=\textwidth]{images/erd-organizations.png}
    \caption{Relations entre les entités principales}
    \label{fig:erd}
\end{figure}

Comme montré dans la figure \ref{fig:erd}, l'entité \texttt{organizations} est au centre...
```

## Checklist d'intégration

- [ ] Générer toutes les images nécessaires
- [ ] Créer le dossier `images/` dans le projet
- [ ] Placer les images dans `images/`
- [ ] Ajouter les packages TikZ si nécessaire
- [ ] Insérer les figures aux bons emplacements
- [ ] Numéroter et légender toutes les figures
- [ ] Ajouter des références croisées (`\ref{fig:...}`)
- [ ] Compiler le document pour vérifier
- [ ] Vérifier que toutes les images s'affichent correctement

## Images recommandées pour le rapport

Pour un rapport complet, créez ces 7 images :

| Fichier | Description | Emplacement | Source |
|---------|-------------|-------------|---------|
| `arch-couches.png` | Architecture en couches | Chapitre 6.1 | Mermaid Diag. 1 |
| `arch-deployment.png` | Déploiement production | Chapitre 6.4 | PlantUML Deployment |
| `flux-creation-mission.png` | Séquence création mission | Chapitre 6.3 | PlantUML Séquence |
| `flux-gps.png` | Flux GPS temps réel | Chapitre 6.3 | PlantUML Séquence |
| `erd.png` | Modèle de données | Chapitre 6.2 | Mermaid ERD |
| `arch-security.png` | Architecture sécurité | Chapitre 6.5 | Graphviz Security |
| `pipeline-cicd.png` | Pipeline CI/CD | Chapitre 6.4 | Mermaid Pipeline |

## Compilation sur Overleaf

### Avec images PNG

1. Uploadez toutes les images dans un dossier `images/` sur Overleaf
2. Le document compilera automatiquement
3. Si erreur, vérifiez les chemins dans `\includegraphics`

### Avec TikZ

1. Collez le code TikZ directement dans le document
2. Overleaf compile automatiquement avec TikZ
3. Temps de compilation plus long mais aucun upload nécessaire

## Résolution des problèmes

### Image ne s'affiche pas
```latex
% Vérifier le chemin
\includegraphics[width=0.9\textwidth]{images/arch-couches.png}
% ou sans le dossier si uploadé à la racine
\includegraphics[width=0.9\textwidth]{arch-couches.png}
```

### Image trop grande
```latex
% Ajuster la largeur
\includegraphics[width=0.7\textwidth]{image.png}
% ou la hauteur
\includegraphics[height=10cm]{image.png}
```

### Erreur TikZ
```latex
% Vérifier que tous les packages sont chargés
\usepackage{tikz}
\usetikzlibrary{shapes,arrows,positioning}
```

## Exemple complet d'intégration

Voici un exemple de section complète avec diagrammes :

```latex
\section{Flux de données}

Le système gère plusieurs flux de données critiques pour assurer le fonctionnement en temps réel.

\subsection{Workflow de création de mission}

Le processus de création d'une mission suit une séquence bien définie, comme illustré dans la figure \ref{fig:workflow-mission}.

\begin{figure}[H]
    \centering
    \includegraphics[width=0.85\textwidth]{images/flux-creation-mission.png}
    \caption{Diagramme de séquence - Création et optimisation d'une mission}
    \label{fig:workflow-mission}
\end{figure}

Le dispatcher commence par ouvrir le Map Builder (étape 1 de la figure \ref{fig:workflow-mission}). Il ajoute ensuite les sites géographiques sur la carte interactive, puis définit les items à transporter avec leurs points de collecte et de livraison. Après avoir sélectionné les véhicules disponibles, il clique sur "Créer Mission".

Le frontend Next.js envoie alors une requête à la Server Action \texttt{createMissionAction}, qui insère les données dans PostgreSQL. Une fois la mission créée, le dispatcher peut lancer l'optimisation de la route en cliquant sur le bouton dédié.

Cette action déclenche un appel au service FastAPI d'optimisation (étape 2), qui utilise Google OR-Tools pour calculer la séquence optimale des arrêts en respectant les contraintes de fenêtres horaires et de capacité des véhicules. La solution est ensuite sauvegardée et affichée sur la carte sous forme de polyline reliant tous les arrêts.

\subsection{Workflow de suivi GPS en temps réel}

Le suivi GPS constitue le cœur du système de tracking, comme détaillé dans la figure \ref{fig:workflow-gps}.

\begin{figure}[H]
    \centering
    \includegraphics[width=0.9\textwidth]{images/flux-gps.png}
    \caption{Diagramme de séquence - Flux de données GPS en temps réel}
    \label{fig:workflow-gps}
\end{figure}

[Suite de l'explication du flux GPS...]
```

## Résultat attendu

Après intégration, votre rapport devrait contenir :
- 5 à 7 diagrammes professionnels
- Des figures numérotées automatiquement
- Des références croisées dans le texte
- Une table des figures en début de document

La table des figures sera générée automatiquement avec :
```latex
\listoffigures
```
