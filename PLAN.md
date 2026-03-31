# Cognitive Games Plan

## Goal

Build a small collection of cognitive mini-games that can be hosted as a static site.

Core product shape:
- first page = list of games
- click a game = load that game immediately
- each game works with generated data or local mock data
- no backend required for MVP

## Product Rules

- must be statically hostable
- keep state in the browser only
- game rounds should start fast, no heavy setup
- each game needs a clear score loop: start -> play -> result -> replay
- mobile and desktop both need to feel intentional, not like a stretched card grid

## MVP Structure

### 1. Landing page
- grid/list of game cards
- category chips / tabs for filtering
- categories shown as real content buckets, not just tags
- each card shows: title, short description, difficulty, estimated round length
- hover/tap preview animation to make the page feel alive

### 2. Game page
- game area
- top bar with timer / score / restart
- short instructions visible before first round
- result state with score and replay CTA

### 3. Shared systems
- common shell layout
- shared timer utilities
- shared scoring model
- local mock/game-generated data only
- reusable difficulty config per game

## Design Direction

Modern, sharp, playful UI, but not childish.

Visual direction:
- bold typography with personality
- bright but controlled color system
- layered background, not plain white
- soft motion for transitions between lobby, game, and result
- game cards should feel like a gallery, not a dashboard

UI rules:
- strong contrast for timers and game-critical info
- one clear accent color per game to help identity
- avoid clutter inside game screens
- animations should support feedback, not distract from memory/focus tasks
- design should make even simple games feel premium

Suggested visual structure:
- landing page with large hero + game shelf/cards
- category navigation under the hero
- each game gets its own accent color and icon
- subtle reveal animations on load
- responsive layout with touch-friendly controls

## Category System

The landing page should group games by category first.

Categories:
- Visual Memory
- Working Memory
- Spatial Reasoning
- Attention and Speed

Why this structure:
- makes the lobby easier to scan
- gives variety without needing dozens of games
- helps users understand what type of challenge they are choosing
- keeps future expansion organized

## Game Backlog By Category

### Visual Memory

1. Chess Glance (MVP)
- show a chessboard with pieces for a few seconds
- hide it
- reveal a new board with one additional piece
- player clicks which piece is new
- strong visual hook and instantly understandable

2. Piece Recall (MVP)
- show a chessboard with pieces
- hide it
- ask the player to place or select where a specific piece was
- can reuse the same board rendering system as Chess Glance

3. Pattern Grid (MVP)
- show a grid with some cells highlighted
- hide it
- player recreates the pattern
- scalable difficulty with larger grids and shorter preview time

4. Pair Recall
- short memory flip game
- cards reveal briefly, then hide
- player matches pairs with move/time scoring

### Working Memory

5. Sequence Echo (MVP)
- show a sequence of lights, symbols, or tiles
- player repeats the order
- difficulty scales by sequence length and speed
- easy to implement with a clear score loop

6. N-Back Lite
- stream letters, positions, or sounds
- player marks when the current item matches N steps back
- more serious cognitive-training feel

### Spatial Reasoning

7. Path Memory
- animate a path through a grid
- player redraws the same route
- good fit for both mouse and touch

8. Motion Compare
- show two short visual states
- player decides what changed
- can evolve into shape, color, or position differences

9. Mental Rotation
- show a shape and several rotated/mirrored options
- player picks the true match
- adds variety beyond memory-only games

### Attention and Speed

10. Number Sweep
- numbers appear scattered on the screen
- player taps them in ascending order as fast as possible
- useful for focus and speed

11. Color-Word Clash
- show color words in conflicting ink colors
- player chooses the ink color, not the word
- simple static-site game with strong replay value

12. Reaction Gate
- wait for the correct signal, then click immediately
- punish early clicks
- useful as a fast-session game

## Recommended MVP Scope

Start with 4 games:
- Chess Glance
- Piece Recall
- Sequence Echo
- Pattern Grid

Reason:
- good category spread without changing the product shape
- two games share the chess board system
- two games use simpler tile-based rendering
- enough content for a real first release without overbuilding

## Technical Direction

- frontend-only app
- static deployment target from day one
- game config should be data-driven where possible
- shared game contract:
  - metadata
  - instructions
  - difficulty presets
  - round generator
  - score calculator

Keep this lean:
- no auth
- no backend
- no online multiplayer
- no persistence requirement beyond optional local storage later

## Build Phases

### Phase 1: Foundation
- app shell
- landing page
- category filtering and category sections
- routing between games
- shared layout and score/timer UI

### Phase 2: First Playable Set
- Chess Glance
- Piece Recall
- Sequence Echo
- Pattern Grid

### Phase 3: Polish
- transitions and motion
- better onboarding/instructions
- per-game theming
- local best score storage

### Phase 4: Content Expansion
- add 3 to 4 more games from backlog
- improve balancing and difficulty curves
- refine replay loop based on actual feel

## Practical Notes

- The best first version is not a huge training platform. It is a tight, polished mini-arcade.
- Reuse rendering systems where possible. The chess pair should share one board module. Grid-based games should share one tile system.
- Focus on short rounds and immediate replay. That is the core loop.
- If needed later, add daily challenge mode after the base games feel good.
