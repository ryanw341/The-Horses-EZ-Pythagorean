const MODULE_ID = "horses-ez-pythagorean";
const ACTION_ID = "open-calculator";

function fmt(n, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : "-";
}

function getControlledTokens() {
  return canvas?.tokens?.controlled ?? [];
}

function tokenCenter(td) {
  const gs = canvas.grid.size || 100;
  return {
    x: td.x + (td.width * gs) / 2,
    y: td.y + (td.height * gs) / 2
  };
}

function pxDist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pxToSceneUnits(px) {
  const gridSizePx = canvas.grid.size || 100;
  const unitsPerGrid = canvas.scene.grid.distance || 5;
  return (px / gridSizePx) * unitsPerGrid;
}

function showResultDialog({ title, a, b, c, unitLabel = "" }) {
  const u = unitLabel ? ` ${unitLabel}` : "";
  new foundry.applications.api.DialogV2({
    window: { title },
    content: `
      <div>
        <p><b>Results</b></p>
        <p>a (horizontal): <b>${fmt(a, 3)}${u}</b></p>
        <p>b (vertical / elevation delta): <b>${fmt(b, 3)}${u}</b></p>
        <p>c (hypotenuse / 3D distance): <b>${fmt(c, 3)}${u}</b></p>
        <hr/>
        <p style="margin:0;">
          Formula: <code>c = sqrt(a^2 + b^2)</code>
        </p>
      </div>
    `,
    buttons: [
      { action: "ok", label: "OK", default: true }
    ],
    position: { width: 420 }
  }).render({ force: true });
}

function showManualDialog() {
  new foundry.applications.api.DialogV2({
    window: { title: "Pythagorean Theorem Calculator" },
    content: `
      <form>
        <p>Enter exactly <b>two</b> values. Leave the third blank.</p>
        <div class="form-group">
          <label>Side a</label>
          <input type="number" step="any" name="a" />
        </div>
        <div class="form-group">
          <label>Side b</label>
          <input type="number" step="any" name="b" />
        </div>
        <div class="form-group">
          <label>Hypotenuse c</label>
          <input type="number" step="any" name="c" />
        </div>
      </form>
    `,
    buttons: [
      {
        action: "solve",
        label: "Solve",
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          const rawA = form.elements.a.value;
          const rawB = form.elements.b.value;
          const rawC = form.elements.c.value;

          const a = rawA === "" ? null : Number(rawA);
          const b = rawB === "" ? null : Number(rawB);
          const c = rawC === "" ? null : Number(rawC);

          const have = [a, b, c].filter((v) => typeof v === "number" && Number.isFinite(v)).length;
          if (have !== 2) return ui.notifications.error("Enter exactly two numeric values.");

          if (Number.isFinite(a) && a <= 0) return ui.notifications.error("a must be > 0.");
          if (Number.isFinite(b) && b <= 0) return ui.notifications.error("b must be > 0.");
          if (Number.isFinite(c) && c <= 0) return ui.notifications.error("c must be > 0.");

          try {
            let ra = a;
            let rb = b;
            let rc = c;

            if (!Number.isFinite(rc)) {
              rc = Math.sqrt(ra * ra + rb * rb);
              showResultDialog({ title: "Solved for c", a: ra, b: rb, c: rc });
              return;
            }

            if (!Number.isFinite(ra)) {
              if (rc <= rb) throw new Error("Invalid triangle: c must be greater than b.");
              ra = Math.sqrt(rc * rc - rb * rb);
              showResultDialog({ title: "Solved for a", a: ra, b: rb, c: rc });
              return;
            }

            if (!Number.isFinite(rb)) {
              if (rc <= ra) throw new Error("Invalid triangle: c must be greater than a.");
              rb = Math.sqrt(rc * rc - ra * ra);
              showResultDialog({ title: "Solved for b", a: ra, b: rb, c: rc });
              return;
            }
          } catch (e) {
            ui.notifications.error(e.message || String(e));
          }
        }
      },
      { action: "cancel", label: "Cancel" }
    ],
    position: { width: 440 }
  }).render({ force: true });
}

function calculateFromTokens() {
  const sel = getControlledTokens();
  const target = [...(game?.user?.targets ?? [])][0];

  if (sel.length !== 1) return false;

  const t1 = sel[0]?.document;
  const t2 = target?.document ?? target?.token ?? target?.document;
  if (!t1) {
    ui.notifications.error("Could not read the selected token.");
    return true;
  }
  if (!t2) {
    ui.notifications.warn("Target another token to measure the distance.");
    return true;
  }
  if (t1 === t2 || t1?.id === t2?.id) {
    ui.notifications.warn("Select one token and target a different token.");
    return true;
  }

  const c1 = tokenCenter(t1);
  const c2 = tokenCenter(t2);

  const horizPx = pxDist(c1, c2);
  const a = pxToSceneUnits(horizPx);

  const e1 = Number.isFinite(t1.elevation) ? t1.elevation : 0;
  const e2 = Number.isFinite(t2.elevation) ? t2.elevation : 0;
  const b = Math.abs(e2 - e1);

  const c = Math.sqrt(a * a + b * b);
  const unitLabel = canvas.scene.grid.units || "";

  showResultDialog({
    title: "Token 3D Distance (Pythagorean)",
    a,
    b,
    c,
    unitLabel
  });
  return true;
}

function runCalculator() {
  if (!canvas?.ready) {
    ui.notifications.error("Canvas must be active.");
    return false;
  }

  const usedTokens = calculateFromTokens();
  if (!usedTokens) showManualDialog();
  return true;
}

function canUseModule() {
  return game.user.isGM || game.settings.get(MODULE_ID, "allowPlayers");
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "allowPlayers", {
    name: "Allow non-GM usage",
    hint: "Permit players to open the calculator via the hotkey or macro API.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.keybindings.register(MODULE_ID, ACTION_ID, {
    name: "Open Pythagorean Calculator",
    hint: "Calculates 3D token distance or opens the manual solver.",
    editable: [{ key: "KeyP", modifiers: ["Control", "Shift"] }],
    onDown: () => {
      if (!canUseModule()) {
        ui.notifications.warn("Only GMs can use this calculator unless enabled in module settings.");
        return false;
      }
      return runCalculator();
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
});

Hooks.once("ready", () => {
  const api = {
    run: () => {
      if (!canUseModule()) {
        ui.notifications.warn("Only GMs can use this calculator unless enabled in module settings.");
        return false;
      }
      return runCalculator();
    }
  };

  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = api;
  globalThis.HorsesPythagorean = api;
});
