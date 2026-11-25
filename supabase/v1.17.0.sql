-- Use the existing vehicle ownership and app-access policies for notes.
alter table mycar.vehicles
  add column if not exists notes text
  constraint vehicles_notes_length check (char_length(notes) <= 6000);

notify pgrst, 'reload schema';
