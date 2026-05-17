# The Horses EZ Pythagorean

Hotkeyable Pythagorean calculator for Foundry VTT with 3D token distance support.

## Requirements

- Foundry VTT v13 or newer (verified on v14)

## Installation

- Manifest URL: `https://raw.githubusercontent.com/ryanw341/The-Horses-EZ-Pythagorean/main/module.json`
- Latest release ZIP: `https://raw.githubusercontent.com/ryanw341/The-Horses-EZ-Pythagorean/main/horses-ez-pythagorean.zip`

## Usage

1. **Default hotkey:** `Ctrl` + `Shift` + `P` (customizable in **Configure Controls**).
2. **Token-to-token distance:** Select one token, target another, then use the hotkey. A dialog shows horizontal distance (scene units), elevation delta, and 3D hypotenuse.
3. **Manual solver:** If no valid token/target pair is found, a dialog lets you enter any two sides (`a`, `b`, `c`) to solve the third.
4. **Allow player access:** Enable **Allow non-GM usage** in the module settings if players should open the calculator.

### Macro / API

The module exposes `HorsesPythagorean.run()` (also `game.modules.get("horses-ez-pythagorean").api.run()`) to trigger the calculator from macros.
