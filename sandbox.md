# Sandbox & Deferred Concepts

This document archives experimental features, deferred concepts, and research phases decoupled from the active Grid Engine roadmap.

---

### Phase n: Real-Time Game Loop & Autonomous NPC AI (`tick()`)
* **Motivation**:
  `EnemyDecoration` instances are spawned into `all_agents`, but remain static. An active world requires living entities that react to the player.
* **Implementation Plan**:
  - Implement a central ticker loop (`requestAnimationFrame` / 100ms tick interval).
  - Add Finite State Machine (FSM) AI for enemies:
    - **Patrol**: Wander within home grass biome.
    - **Alert / Investigate**: Turn toward player if sound/movement detected within radius.
    - **Chase**: Execute pathfinding toward player coordinates.
    - **Attack / Interact**: Trigger encounter if within distance $\le 1.4$.

### Phase n: Dynamic Fog of War & Line of Sight (Raycasting FOV)
* **Motivation**:
  The entire map is currently 100% visible, reducing exploration excitement and tactical value.
* **Implementation Plan**:
  - Add shadowcasting or Bresenham raycasting field of view (FOV).
  - Three visibility tiers: Unexplored (black), Previously Explored (dim / static), Currently Visible (bright / dynamic).

### Phase n: Web Audio SFX & Interactive Particle Effects
* **Motivation**:
  Visual actions (woodcutting, walking, enemy encounters) lack sensory feedback.
* **Implementation Plan**:
  - Zero-dependency procedural sound generator using Web Audio API:
    - Rhythmic footsteps with tonal variation (grass vs. stone).
    - Wooden crunch / thud sound on tree chopping.
    - Subtle tone chime upon destination arrival.
  - SVG/Canvas particle burst (wood splinters, grass blades) when interacting with environment tiles.

