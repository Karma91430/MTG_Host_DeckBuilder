# Inventaire des fonctionnalites a venir

Ce qui existe est decrit dans le README. Ce document recense ce qui manque
encore, par valeur decroissante, avec ce que chaque chantier suppose.

---

## 1. Suggestions de cartes pour un deck

La fonctionnalite la plus utile qui manque, et la plus interessante a
construire. L idee : repondre a « que mettre dans ce deck ? » a partir de ce
que le deck raconte deja de lui-meme.

### Pourquoi c est faisable sans service tiers

Scryfall expose deux choses decisives. D une part `edhrec_rank`, un indice de
popularite en Commander, deja present dans les donnees qu on met en cache.
D autre part une syntaxe de recherche assez riche pour traduire n importe
quelle intention en requete. Il n y a donc rien a moissonner ailleurs.

### Les signaux a lire dans un deck

**L identite couleur du commandant.** Toute suggestion doit y tenir, sinon
elle est injouable. C est le filtre de base, deja implemente pour la legalite.

**Les sous-types dominants.** Le deck compte huit Elfes ? Le theme est tribal,
et les autres Elfes de l identite sont des candidats naturels. La lecture des
sous-types existe deja, elle sert au filtrage.

**Les motifs de texte recurrents.** Trois cartes qui parlent de jetons, quatre
de sacrifice : la mecanique se devine. Une liste de motifs -- jetons, sacrifice,
pioche, blink, +1/+1, artefacts, cimetiere -- suffit a nommer les deux ou trois
axes d un deck.

**Les creux structurels.** La courbe de mana et la composition sont deja
calculees. Un deck a quatre cartes de rampe quand la moyenne en tourne autour de
dix, ou aucune carte a deux manas, presente un creux nommable.

**Les manques de mana.** L analyse demande contre offre est deja la : une
couleur dont la demande depasse nettement les sources appelle des terrains ou de
la fixation dans cette couleur.

### Ce que ca donnerait a l ecran

Un panneau de suggestions, organise par motif plutot qu en liste plate, chaque
groupe portant sa raison d etre :

- « Renforcer le theme Elfes » — les Elfes de l identite absents du deck,
  classes par popularite ;
- « Votre courbe manque de cartes a deux manas » — sorts a deux manas dans
  l identite, correspondant aux mecaniques detectees ;
- « Sous la moyenne en rampe » — rampe legale dans l identite ;
- « Le vert est sous-alimente » — sources vertes, terrains et fixation.

Chaque suggestion s ajoute au deck ou a la liste « a voir » d un clic, et
s ecarte pour ne plus etre proposee.

### Ce qu il faut construire

Un module d analyse qui transforme un deck en une liste de manques nommes, un
traducteur de manques en requetes Scryfall, et un classement des resultats par
popularite en ecartant ce qui est deja dans le deck. Le panneau reutilise les
composants de recherche existants.

Le point delicat n est pas technique mais editorial : les seuils. A partir de
combien de cartes un sous-type devient-il un theme ? Combien de rampe attend-on
vraiment ? Ces valeurs devront etre reglables, et discutees.

---

## 2. Choix de l edition d une carte

Selectionner le tirage precis : illustration alternative, edition d origine,
version etendue. Scryfall expose les impressions d une carte par une requete
dediee. Il faut stocker l identifiant choisi par entree de deck plutot que
l identifiant generique, et offrir un selecteur dans la fiche detaillee.

Fonctionnalite tres visible, d un cout modere.

---

## 3. Comparaison de deux decks

Ce qu ils partagent, ce qui les distingue, l ecart de courbe et de prix. Utile
pour suivre l evolution d une liste ou comparer deux versions d un meme deck.
Purement local, aucun appel supplementaire.

---

## 4. Estimation de puissance

Situer un deck sur une echelle de puissance, comme le font les paliers
Commander. Les signaux existent -- tuteurs, rapidites, combos connus, cout moyen,
densite de removal -- mais le resultat reste subjectif et demande un travail de
calibrage serieux. A ne tenter qu apres les suggestions, dont il reutiliserait
l analyse.

---

## 5. Gestion de collection

Aujourd hui chaque carte porte un statut d acquisition au sein d un deck. Une
vraie collection serait transverse : ce qu on possede, en combien
d exemplaires, et ce qui manque pour monter tel deck. Suppose une table dediee,
un import de collection, et une reconciliation avec les decks.

---

## 6. Playtest a deux mains

Simuler un adversaire, ou au moins une seconde main, pour tester des
interactions plutot que de faire tourner le deck a vide. Demande de repenser
l etat de la partie, aujourd hui concu pour un seul joueur.

---

## 7. Historique des versions d un deck

L annulation couvre la session en cours sur quarante pas. Un historique
nomme -- « avant refonte terrains », « version tournoi » -- permettrait de
revenir a un etat ancien et de comparer. La table d instantanes existe deja, il
s agirait de la rendre durable et nommable.

---

## Ecarte volontairement

**Partage public et communaute.** L application est auto-hebergee pour un
usage personnel ; publier des decks supposerait comptes, moderation et
exposition sur internet.

**Suivi de prix multi-vendeurs.** Scryfall donne un prix indicatif, suffisant
pour estimer un deck. Interroger plusieurs marchands demanderait autant de
integrations fragiles.

**Detection de combos.** Reclame une base de combos connus, donc une dependance
externe a maintenir, pour un benefice qui recoupe largement l estimation de
puissance.
