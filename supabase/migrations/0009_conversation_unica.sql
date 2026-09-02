-- Un lead tiene UNA conversación por canal.
--
-- Sin esta restricción, correr la semilla dos veces creaba conversaciones
-- repetidas y cualquier `join` contra ellas multiplicaba las filas del lead.
-- Se detectó porque el listado del embudo mostraba 56 leads existiendo 34.

delete from conversation c
 using conversation d
 where c.lead_id = d.lead_id
   and c.canal = d.canal
   and c.ctid > d.ctid;

create unique index if not exists conversation_lead_canal_unico
  on conversation (lead_id, canal);
