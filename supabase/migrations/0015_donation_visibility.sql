-- FR08: donors choose "Hiển thị công khai", "Ẩn danh" or "Không hiển thị". The last two leave
-- no name, contact or message, so contact may now be empty.
--   Hiển thị công khai → is_public = true,  is_hidden = false
--   Ẩn danh            → is_public = false, is_hidden = false (wall shows "Nhà hảo tâm ẩn danh")
--   Không hiển thị     → is_public = false, is_hidden = true  (off the wall, still in the total)

alter table donations alter column contact drop not null;
alter table donations drop constraint donations_contact_len;
alter table donations add constraint donations_contact_len
  check (contact is null or char_length(contact) between 1 and 200);
