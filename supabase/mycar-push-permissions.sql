-- Applied: server-only permissions for scheduled expiry delivery.
grant usage on schema mycar to service_role;
grant select on mycar.preferences,mycar.documents,mycar.vehicles to service_role;
