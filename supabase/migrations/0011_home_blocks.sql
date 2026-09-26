-- FR01, FR17: content blocks for the new home page (Hero, Về chúng tôi, Ý nghĩa dự án).
--
-- "Ý nghĩa dự án" now carries the "Nét Vẽ Yêu Thương" story (FR01 §4), so it starts
-- from whatever the admin already wrote in the old `story` block. The `story` row is
-- left in place but no longer shown or edited.

insert into content_blocks (key, title, body, image_url)
select 'mission', coalesce(nullif(title, ''), 'Ý nghĩa dự án'), body, image_url
from content_blocks
where key = 'story' and (coalesce(body, '') <> '' or image_url is not null)
on conflict (key) do nothing;

insert into content_blocks (key, title, body) values
  ('hero', 'TỰA – Nét Vẽ Yêu Thương',
   'Tự tay vẽ chiếc áo của riêng bạn, và cùng chúng mình hỗ trợ trẻ em có hoàn cảnh đặc biệt.'),
  ('about', 'Về chúng tôi', ''),
  ('mission', 'Ý nghĩa dự án', '')
on conflict (key) do nothing;
