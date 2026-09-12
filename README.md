# Deckbuilder MTG

Construction, gestion et test de decks Magic, auto-heberge.
Next.js 15 (App Router), SQLite, deploiement Docker.

## Fonctionnalites

**Construction** — recherche par la syntaxe complete de Scryfall, ajout au deck,
a la zone de commandement ou a une liste « a voir ».

**Gestion** — liste groupee par type, quantites, statistiques en direct :
courbe de mana, identite couleur, repartition par type, cout moyen, prix indicatif.

**Controles de legalite** — taille attendue selon le format, nombre d'exemplaires,
cartes interdites, et respect de l'identite couleur du commandant.

**Playtest** — toutes les zones (bibliotheque, main, champ de bataille, cimetiere,
exil, commandement), pioche, mulligan a la regle de Londres, engagement des
permanents, compteur de vies et de tours, journal des actions.

**Identite visuelle** — huit palettes, choisies par deck, avec le symbole de
l'extension correspondante. Les couleurs passent par des variables CSS : changer
de theme ne recharge rien.

## Donnees

Les cartes viennent de l'API Scryfall. Les visuels sont references depuis leur
CDN, jamais recopies. Les appels respectent un delai entre requetes et sont mis
en cache localement : une carte deja consultee n'entraine plus aucun trafic.

Seuls tes decks sont stockes, dans une base SQLite.

## Deploiement

```
cp docker-compose.example.yml docker-compose.yml
sudo mkdir -p /DATA/AppData/mtg-deckbuilder
sudo chown -R "$(id -u):$(id -g)" /DATA/AppData/mtg-deckbuilder
docker compose up -d --build
```

L'image se construit sur la machine cible, ce qui compile le module natif SQLite
pour la bonne architecture. Interface sur le port 3646.

`docker-compose.yml` n'est pas versionne : les gestionnaires comme CasaOS le
reecrivent avec leurs propres reglages, ce qui bloquerait chaque `git pull`.

## Developpement

```
npm install
npm run dev
```

| Variable | Defaut | Role |
|---|---|---|
| `MTGDECK_DATA_DIR` | `./data` | Base SQLite et cache des cartes |
