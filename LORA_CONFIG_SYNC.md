# Fork additions — `lora_config` sync for Power Lora Loader

This is a fork of [rgthree-comfy](https://github.com/rgthree/rgthree-comfy) with
one added feature: the **Power Lora Loader** can be **synchronized** between two
nodes via a new `lora_config` input/output. Everything else is upstream rgthree.

## What was added

**`Power Lora Loader (rgthree)`** gains:

- a **`lora_config` input** (STRING),
- a **`lora_config` output** (STRING, JSON of the effective rows).

Wire the output of one loader into the input of another and the second
("follower") mirrors the first ("master").

### 1. Generation-time sync — `py/power_lora_loader.py`
When the `lora_config` input is connected (non-empty), the node applies **those**
rows instead of its own widgets, so the rendered result matches the master.
Otherwise it applies its own `lora_*` widgets as usual. Either way it emits the
effective rows as JSON on the `lora_config` output (chainable). The parser
accepts a bare JSON list, a `{"loras": [...]}` object (interops with the
standalone PowerLoraPlus node), or doubly-encoded JSON.

### 2. Live editor mirror — `web/comfyui/power_lora_sync.js` (new file)
When a loader's `lora_config` input is wired from another loader, its lora rows
are **rebuilt in the editor to match the source** (using rgthree's own
`configure()`), so the two loaders look synchronized while you edit — not only at
generation. Disconnecting restores the node's own rows. The source may be another
`Power Lora Loader (rgthree)` or a `PowerLoraPlus` node (rows read from its
`loras_data` widget).

The mirror is hooked per-instance via the `nodeCreated` extension hook, because
rgthree overrides the node class (`OVERRIDDEN_SERVER_NODES`) — patching the
`nodeType` prototype in `beforeRegisterNodeDef` does not reach the real
instances.

## Usage

1. Add two **Power Lora Loader (rgthree)** nodes.
2. Connect master's **`lora_config`** output → follower's **`lora_config`** input.
3. Give each its own `model` / `clip`. Edit LoRAs on the master; the follower
   mirrors them live and applies them at generation.

> After pulling these changes do a **ComfyUI restart** (Python change) and a
> **hard browser reload** (new JS file).

## Commits (on top of upstream)

- `lora_config` in/out + generation-time sync (`py/power_lora_loader.py`)
- `sync-fork.sh` to merge upstream while keeping these changes
- live editor mirror (`web/comfyui/power_lora_sync.js`)
- mirror fix: hook the instance via `nodeCreated` (rgthree overrides the class)

## Keeping in sync with upstream rgthree

```bash
./sync-fork.sh   # fetch upstream, merge, push; resolve conflicts keeping our additions
```
