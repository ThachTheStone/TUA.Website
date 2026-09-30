-- FR02/FR04: print areas placed on the new shirt photo mockup (public/mockup, 900×943).
-- Ngực trái: upper chest on the wearer's left. Mặt trước: centred, chest down to near the waist
-- (28×36 cm). Mặt sau: centred on the back, a little wider and longer than the front (30×40 cm).
-- Only these three keys change; any other area is kept as is.

update settings
set value = (
  select jsonb_agg(
    case a->>'key'
      when 'chest' then a || '{"xPct": 0.608, "yPct": 0.239}'::jsonb
      when 'front' then a || '{"xPct": 0.5, "yPct": 0.413, "widthCm": 28, "heightCm": 36}'::jsonb
      when 'back'  then a || '{"xPct": 0.5, "yPct": 0.39, "widthCm": 30, "heightCm": 40}'::jsonb
      else a
    end
    order by ord
  )
  from jsonb_array_elements(value) with ordinality as t(a, ord)
)
where key = 'print_areas';
