create index activity_events_actor_user_idx
  on public.activity_events (actor_user_id)
  where actor_user_id is not null;

create index charges_workspace_client_service_fk_idx
  on public.charges (workspace_id, client_id, client_service_id)
  where client_service_id is not null;
