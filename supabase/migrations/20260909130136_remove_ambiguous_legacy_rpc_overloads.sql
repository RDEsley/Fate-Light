-- As novas assinaturas acrescentam um parâmetro opcional ao final. Manter as
-- versões antigas torna chamadas posicionais ambíguas antes mesmo da checagem
-- de EXECUTE, portanto as sobrecargas legadas precisam ser removidas.
drop function if exists public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, date, integer, numeric, integer, integer, numeric, text
);

drop function if exists public.create_expense_with_recurrence(
  text, text, numeric, date, text, text, uuid, text, boolean
);
