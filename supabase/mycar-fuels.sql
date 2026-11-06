-- Applied to the shared project; reference only, do not rerun.
alter table mycar.vehicles add column fuel_types text[] not null default '{}';
alter table mycar.vehicles add constraint vehicles_fuel_types_valid check (cardinality(fuel_types)<=2 and fuel_types <@ array['Benzină','Motorină','Electrică','GPL']::text[] and not (fuel_types @> array['Benzină','Motorină']::text[]) and (cardinality(fuel_types)<2 or fuel_types[1]<>fuel_types[2]));
alter table mycar.events add column fuel_type text, add column fuel_grade text, add column quantity numeric;
alter table mycar.events add constraint events_fuel_type_valid check (fuel_type is null or fuel_type in ('Benzină','Motorină','Electrică','GPL'));
alter table mycar.events add constraint events_quantity_valid check (quantity is null or quantity>0);