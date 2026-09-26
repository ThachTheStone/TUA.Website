            -- Phase 7 fix (FR27): prototype lines carry the prototype's design (its print files), but the
            -- 0001 check still said "a line has a design only if it is CUSTOM", so every order with a
            -- prototype failed with order_items_check. Now: CUSTOM and PROTOTYPE lines have a design,
            -- PLAIN lines don't, and only PROTOTYPE lines point at a prototype.

            alter table order_items drop constraint order_items_check;

            alter table order_items add constraint order_items_design_check
              check ((type in ('CUSTOM', 'PROTOTYPE')) = (design_id is not null));

            alter table order_items add constraint order_items_prototype_check
              check ((type = 'PROTOTYPE') = (prototype_id is not null));
