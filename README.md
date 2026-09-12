# Deckbuilder MTG

Construction, gestion et test de decks Magic, auto-heberge.
Next.js 15 (App Router), TypeScript, SQLite, deploiement Docker.

## Ce que fait l application

### Construction

Recherche en bandeau pleine largeur, repliable, au-dessus du deck. Filtres
combinables : couleurs par symboles officiels, type, rarete, fourchette de cout
converti, restriction au format du deck, et tri par nom, cout, popularite, prix
ou date de sortie. Le champ texte accepte par-dessus la syntaxe complete de
Scryfall. Un champ de quantite permet d ajouter plusieurs exemplaires d un coup.
`Ctrl + K` ramene au champ de recherche.

Trois zones d accueil pour une carte : le deck, la zone de commandement, ou une
liste « a voir » pour ce qu on hesite a inclure. Une carte n appartient qu a une
seule zone : l y rajouter ailleurs la deplace au lieu de la dupliquer.

### Organisation

Trois affichages : grille, colonnes empilees par categorie, ou liste. Groupement
par type ou par categorie personnalisee, choisie parmi douze roles predefinis --
rampe, fixation, pioche, tuteur, removal cible, removal de masse, protection,
finisher, combo, recursion, terrains, utilitaire.

Filtres du deck par nom, par type et par sous-type, les sous-types etant lus
dans la ligne de type et presentes avec leur effectif. Un filtre isole les
cartes hors de l identite couleur du commandant.

### Analyse

Un tableau de bord sous la liste. Quatre tuiles donnent les grandeurs
principales, puis quatre blocs :

- **courbe de mana**, terrains exclus ;
- **mana demande et disponible** : les symboles colores reclames par les couts
  face aux cartes capables de les produire. Un deck dont la demande en vert
  depasse ses sources vertes se bloquera, quel que soit son nombre de terrains ;
- **composition** par grande famille ;
- **main de depart** : nombre moyen de chaque famille dans une ouverture a sept
  cartes, chances d en tenir au moins une, et repartition du nombre de terrains
  avec la part de mains jouables. Le calcul suit la loi hypergeometrique, la
  pioche se faisant sans remise.

Les controles de legalite verifient la taille attendue, le nombre d exemplaires,
les cartes interdites et l identite couleur du commandant.

### Acquisition

Chaque carte porte un statut -- possedee, a acheter, manquante -- et le tableau
de bord chiffre ce qu il reste a acquerir. C est la gestion de collection utile
sans avoir a saisir toute sa collection.

### Playtest

Table de jeu en pleine largeur et pleine hauteur. La bibliotheque est une pile
posee en bas a gauche : un clic pioche, un clic droit l ouvre pour la parcourir.
Cimetiere, exil et zone de commandement sont des piles voisines qui acceptent
qu on y fasse glisser une carte.

Un clic sur une carte en main la joue : les permanents rejoignent le champ de
bataille a une place calculee -- terrains alignes en bas, reste au-dessus -- et
les ephemeres partent au cimetiere. Le glisser-deposer place soi-meme, et une
carte ainsi posee n est plus deplacee par la mise en place automatique.

Clic pour engager, clic droit sur une carte pour les marqueurs et les
deplacements, clic droit sur le plateau pour les actions generales. Les jetons
proposes sont ceux que les cartes du deck peuvent reellement produire, d apres
les pieces liees renseignees par Scryfall.

Raccourcis : `D` pioche, `N` tour suivant, `U` degage, `M` mulligan, `S`
melange, `T` jeton, `Echap` ferme.

### Import et export

Format « 1 Sol Ring », celui qu exportent les outils courants. Le lecteur
absorbe les variantes reelles : quantites en « 1x », codes d edition entre
parentheses, numeros de collecteur, marqueurs de finition, commentaires. Les
intitules Commander, Sideboard et Maybeboard rangent les cartes qui suivent.
Les noms introuvables et les lignes illisibles sont signales plutot que
d interrompre l import.

### Rangement

Dossiers et etiquettes. Un rail presente les dossiers en cibles de depot : on
fait glisser une vignette de deck pour l y ranger. Creation a la volee,
suppression qui libere les decks. Filtres par nom, dossier, format et etiquette.

### Identite visuelle

Huit palettes, choisies par deck, accompagnees du symbole de l extension
correspondante. Les couleurs passent par des variables CSS : changer de theme ne
recharge rien. Un curseur regle la taille des cartes, memorise, avec une valeur
initiale deduite de la largeur de l ecran.

### Annuler et retablir

Par instantanes du contenu du deck, sur quarante pas. Import et versements
compris.

## Donnees

Les cartes viennent de l API Scryfall, avec un delai entre requetes comme leur
documentation le demande, et un cache local : une carte deja consultee
n entraine plus de trafic. Visuels, symboles de mana et dos de carte sont
references depuis leur CDN, jamais recopies. Seuls les decks sont stockes.

## Deploiement

```
cp docker-compose.example.yml docker-compose.yml
sudo mkdir -p /DATA/AppData/mtg-deckbuilder
sudo chown -R "$(id -u):$(id -g)" /DATA/AppData/mtg-deckbuilder
docker compose up -d --build
```

L image se construit sur la machine cible, ce qui compile le module natif SQLite
pour la bonne architecture. Interface sur le port 3646.

`docker-compose.yml` n est pas versionne : les gestionnaires comme CasaOS le
reecrivent avec leurs propres reglages, ce qui bloquerait chaque `git pull`.

## Developpement

```
npm install
npm run dev
```

Ne pas lancer `npm run build` pendant que le serveur de developpement tourne :
les deux ecrivent dans `.next` et le serveur se met a renvoyer des 500. Le
remede est `rm -rf .next && npm run dev`.

| Variable | Defaut | Role |
|---|---|---|
| `MTGDECK_DATA_DIR` | `./data` | Base SQLite et cache des cartes |

## Conventions du code

Les constantes partagees entre serveur et navigateur vivent dans `src/lib/carte.ts`
et `src/lib/categories.ts`, qui n importent rien. Les placer dans `src/lib/db.ts`
ferait entrer `better-sqlite3` et `node:fs` dans le bundle navigateur, et la
compilation echouerait.
