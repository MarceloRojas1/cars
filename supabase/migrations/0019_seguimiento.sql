-- ---------------------------------------------------------------------------
-- Seguimiento de leads que dejaron de contestar.
--
-- El bot sabía decidir sobre lo que LEE: si el mensaje muestra interés o si la
-- persona cierra la puerta. No sabía nada del caso más común de todos — que no
-- pase nada. La gente rara vez dice "no me interesa": simplemente deja de
-- responder, y el lead se queda en "Nuevo" pareciendo vivo para siempre.
--
-- Eso no se puede detectar dentro de una conversación, porque el disparador es
-- justamente que no llegue un mensaje. Hace falta algo que mire el reloj, y de
-- ahí el trabajo periódico que consume esto.
-- ---------------------------------------------------------------------------

-- Cuántos días de silencio antes de dar seguimiento. Por automotora: un auto
-- de $40M no se decide al mismo ritmo que uno de $5M.
alter table assistant_config
  add column if not exists dias_sin_respuesta int not null default 3;

comment on column assistant_config.dias_sin_respuesta is
  'Días sin recibir mensaje antes de que el bot reintente una vez. 0 lo desactiva.';

/*
 * Cuál es la etapa de seguimiento.
 *
 * Una marca y no el nombre "Sin Respuesta": cada automotora renombra sus
 * etapas, y buscar por texto rompe en silencio en cuanto alguien la traduce o
 * le cambia una tilde. Es el mismo criterio que `kind` para las salidas y
 * `responsable` para quién conduce.
 */
alter table stage
  add column if not exists es_seguimiento boolean not null default false;

comment on column stage.es_seguimiento is
  'La etapa donde caen los leads que dejaron de responder. Debe llevar responsable = ia para que el bot pueda reintentar.';

update stage set es_seguimiento = true where nombre = 'Sin Respuesta';

-- Solo una por automotora: si hubiera dos, "a dónde va" dejaría de tener
-- respuesta y el trabajo periódico elegiría una al azar.
create unique index if not exists stage_seguimiento_idx
  on stage (organization_id) where es_seguimiento;

/*
 * Cuándo se le dio seguimiento. NULL = todavía no.
 *
 * Es lo que hace que el reintento sea UNA vez: sin esta marca, el trabajo
 * periódico volvería a escribirle cada día al mismo silencio, que es la forma
 * más rápida de que a una automotora la bloqueen por spam en WhatsApp.
 */
alter table lead
  add column if not exists seguimiento_at timestamptz;
