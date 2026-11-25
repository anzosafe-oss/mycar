-- Keep the legacy note until the first successful edit from the new client.
alter table mycar.vehicles
  add column if not exists notes_collection jsonb
  constraint vehicles_notes_collection_shape check (
    notes_collection is null or (
      jsonb_typeof(notes_collection) = 'object'
      and notes_collection ? 'entries'
      and jsonb_typeof(notes_collection->'entries') = 'array'
      and notes_collection ? 'revision'
      and jsonb_typeof(notes_collection->'revision') = 'number'
    )
  );

notify pgrst, 'reload schema';
