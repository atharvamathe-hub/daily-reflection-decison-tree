# Design Rationale: The Daily Reflection Tree

## Overview
The Daily Reflection Tree is a deterministic agent designed to guide employees through three psychological transitions: from **Victim to Victor** (Locus), **Entitlement to Contribution** (Orientation), and **Self-Centrism to Altrocentrism** (Radius). 

The goal was to create a tool that feels like a "wise colleague" — asking probing questions that encourage self-discovery without being moralistic or judgmental.

## 1. Psychological Foundation

### Axis 1: Locus of Control (Julian Rotter)
Instead of asking "Are you a victim?", the tree starts with a neutral "Weather Report" for the day. 
- **The Design Choice:** If the day was "Stormy," the tree validates the external difficulty first. It then narrows the focus to find the "small choice" the employee made. This mirrors Rotter’s internal/external locus — it doesn't deny external reality, but it insists on finding the internal footprint.

### Axis 2: Orientation (Psychological Entitlement vs. OCB)
Entitlement is often invisible to the individual. 
- **The Design Choice:** I used **Organizational Citizenship Behavior (OCB)** as the positive pole. The questions ask about "unrequested assists" or "helping without a witness." 
- **The Reframe:** For those leaning toward entitlement (focusing on own work/recognition), the reflection defines it not as selfishness, but as **tunnel vision**. This reduces shame and makes the "edge" for growth clear: just notice one other person tomorrow.

### Axis 3: Radius (Self-Transcendence - Maslow)
Maslow’s 1969 "The Farther Reaches of Human Nature" highlights that the healthiest humans look beyond self-actualization toward service to others.
- **The Design Choice:** The tree asks "who is in the picture" of your biggest moment. It uses the concept of **ripples** (how my mood affected a colleague) to bridge the gap for those who feel their day was "just about me."

## 2. Structural Design & Determinism

The tree was designed for **maximum traceability**:
- **Invisible Routing:** `decision` nodes handle the logic so the user doesn't see "calculating..." screens.
- **Interpolation:** By using `{NODEID.answer}`, the `reflection` nodes mirror the user's language back to them. This creates a sense of "being heard" without needing an LLM to generate text.
- **Signal Tallying:** Instead of a simple 1-10 score, the tree uses "dominant" poles. This allows the `SUMMARY` node to provide 1 of 8 tailored final reflections based on the combination of the three axes.

## 3. Trade-offs and Constraints

- **Fixed Options vs. Free Text:** While free text allows for "venting," fixed options force **binary or spectrum-based choices**. This simplifies the cognitive load for a tired employee and ensures the path is deterministic and auditable.
- **Sequential Flow:** The axes follow a logical order. You cannot truly contribute (Axis 2) if you don't believe you have agency (Axis 1). You cannot transcend yourself (Axis 3) if you are stuck in a transactional mindset (Axis 2).

## 4. Future Improvements

With more time, I would:
1. **Dynamic Options:** Allow options to be filtered based on Axis 1 answers (e.g., if you were in the "driver's seat," Axis 2 options could be more ambitious).
2. **Persistence:** Allow the agent to reference *yesterday's* final choice in today's opening.
3. **Multi-Step Reflections:** Deepen the "reflection" nodes into mini-conversations if the user selects "Tell me more."

---
*Created as part of the DT Fellowship Assignment.*
