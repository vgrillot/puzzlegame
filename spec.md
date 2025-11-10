je veux que tu m'aides à construire un jeu à la tictactoe
minimaliste et simpliste
en pure js ou presque, canvas, vanilla.js, alpine.js

# Implementation guidelines

## Platform and rendering

- The game must run fully in the browser with no backend dependencies.
- Initial target is desktop browsers; adapt the layout dynamically to the current window size.
- Choose the rendering stack you judge best (vanilla JS, Canvas API, Alpine.js...), but keep it lightweight.

## Interaction model

- Pieces are moved via mouse dragging; plan for touch support later.
- Movements must respect the collision rules already defined for the pieces and walls.

## Game state management

- Track the number of moves performed during a session.
- Maintain a chronological move history with full undo support (last move reversible at minimum).
- Persist the initial board layout and future levels inside JSON definitions to ease extension.

## Victory flow and presentation

- When the `d` block exits, end the game with a victory state.
- Offer a fast replay of the recorded moves so players can review the solution.
- Apply a shiny, polished visual style for the board, pieces, and UI elements.

# presentation du jeu

## plateau

voici le plateau vide:

++++++
+....+
+....+
+....+
+....+
+....+
++  ++

### légende:
"+" : un mur bloquant, fixe, infranchissable
"." : une case vide où un peut y déplacer une pièce
" " : un trou dans le mur qui permet de sortir une pièce

## les pièces:

### une pièce de 1x1
a

elle est bleue

### une pièce de 2x1 horizontale
bb

elle est jaune

### une pièce de 1x2 verticale
c
c

elle est orange

### une pièce de 2x2

dd
dd

elle est rouge
c'est cette pièce qui peut sortir par le bas du plateau via les cellules " "




## position de départ:
voici les pièces en début de la partie:

++++++
+cddc+
+cddc+
+.bb.+
+caac+
+caac+
++  ++


# règles du jeu

## deplacements

une pièce ne peut bouger que si elle a suffisamment d'espace pour se déplacer dans son ensemble, vers des cases vides "." uniquement
une pièce est bloquée par une autre pièce ou un mur
une pièce ne peut pas pousser une autre pièce
seule la pièce finale "d" peut se déplacer vers le trou " "

## condition de victoire
si la pièce finale "d" se déplace vers les trous " " cela veut dire qu'elle peut sortir et c'est gagné.