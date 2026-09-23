# Canvas designer (react-konva)

## Setup
- `npm i konva react-konva zustand`. Load the designer with `next/dynamic(..., { ssr: false })`, because Konva needs `window`.
- One **Stage per print area**; the user switches areas with tabs ("Ngực trái / Mặt trước / Mặt sau"). Behind the stage, show the shirt mockup (front or back image) tinted to the chosen color, with a dashed rectangle marking the area.
- Stage display size = the area aspect ratio (widthCm/heightCm) fitted to the screen. Keep a logical coordinate system where 1 unit = 1 display px at a base width of 500. Scale on resize and store the drawing in logical units.

## Tools
| Tool | Implementation |
|---|---|
| Brush | `Konva.Line` with `tension 0.5`, `lineCap/lineJoin 'round'`; add points on pointermove |
| Eraser | Same Line with `globalCompositeOperation: 'destination-out'` (erases only inside the active layer) |
| Size | Slider 2–60 |
| Color | Palette of preset swatches plus `<input type="color">` |
| Shapes | Rect, Circle and Line: drag to size; filled or outline toggle |
| Fill | Flood fill: rasterize the active layer with `layer.toCanvas()`, run a scanline flood fill at the tap point (tolerance around 32), and replace the layer contents with one `Konva.Image`. Rasterizing is fine; it happens only when fill is used |
| Layers | Up to 5 `Konva.Layer`s: add, delete, hide/show, reorder. Tools act on the active layer |
| Undo/Redo | History stack of serialized area state (`layers → nodes JSON`), capped at 40; push on pointerup |
| Clear | Confirms, then empties all layers of the current area (undoable) |

## Clipping (only draw inside the area)
The Stage *is* the print area, so everything is clipped by default. Also set `clipFunc` on each layer as a safety net.

## Touch and tablet (NFR01)
- CSS `touch-action: none` on the stage container; use pointer events (Konva handles these).
- Ignore multi-touch while drawing (2 fingers = do nothing). Keep the toolbar at the bottom on tablets with 44px tap targets.
- Throttle nothing on pointermove, but call `layer.batchDraw()`. For long strokes, avoid re-rendering React per point: mutate the line node through a ref, then commit to state on pointerup.

## Export (NFR05)
```ts
const pxW = Math.round(area.widthCm / 2.54 * dpi); // dpi from settings (200)
const pixelRatio = pxW / stage.width();
const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio }); // transparent bg
```
Export one PNG per non-empty area, and also a low-resolution mockup preview (the stage composited over the mockup) for the cart and admin. Send them to the server action as base64. The server uploads to the `designs` bucket; the client never talks to storage directly.

## Validation
- Custom item requires at least 1 non-empty area and the commitment checkbox (FR05) before "Thêm vào giỏ".
- Save the draft (JSON per area) in the cart store so the user can reopen and edit it.
- **Never render `<input type="file">` in the designer** (BR01).
