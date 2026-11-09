-- Nullable for compatibility: existing vehicles keep all four widgets visible.
alter table mycar.vehicles add column if not exists dashboard_widgets jsonb
constraint vehicles_dashboard_widgets_array check
(dashboard_widgets is null or jsonb_typeof(dashboard_widgets)='array');
comment on column mycar.vehicles.dashboard_widgets is
'Per-vehicle dashboard document widget order and visibility; null preserves default layout.';
notify pgrst,'reload schema';
