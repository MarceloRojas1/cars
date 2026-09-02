-- Generado por scripts/generar-seed-sql.ts. No editar a mano.
begin;
insert into organization (id, nombre, slug, plan, limite_usuarios, limite_sucursales, limite_vehiculos, limite_conversaciones_ia, proximo_cobro)
   values ('6f72675f-6d61-726b-6574-636172000000', 'Marketcar', 'market-car', 'Pro', 10, 3, 100, 2000, '2026-08-04')
   on conflict (id) do nothing;
select set_config('app.organization_id', '6f72675f-6d61-726b-6574-636172000000', false);
insert into branch (id, organization_id, codigo, nombre, direccion, comuna, region, telefono, email, es_principal, activa)
   values ('7375635f-3030-3100-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'SUC-001', 'Los Trapenses', 'Los Trapenses 3061 L13 y L14', 'Lo Barnechea', 'Metropolitana', '+5695955 5576', 'contacto@marketcar.cl', true, true) on conflict (id) do nothing;
insert into app_user (id, organization_id, branch_id, nombre, email, telefono, rol, activo)
   values ('7573725f-6a75-616e-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', null, 'Juan José Domínguez', 'juanjodominguez@marketcar.cl', null, 'owner', true) on conflict (id) do nothing;
insert into app_user (id, organization_id, branch_id, nombre, email, telefono, rol, activo)
   values ('7573725f-6d61-7274-696e-000000000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'Martin Stuckrath', 'martin@marketcar.cl', '+56989069916', 'vendedor', true) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f6e-7565-766f-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Nuevo', 'entry', '#7C8DAE', 1, true) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f63-616c-6966-6963-616e646f0000', '6f72675f-6d61-726b-6574-636172000000', 'Calificando', 'progress', '#C08A3E', 2, true) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f63-616c-6966-6963-61646f000000', '6f72675f-6d61-726b-6574-636172000000', 'Calificado', 'progress', '#6FAF8B', 3, false) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f63-6f6e-7461-6374-61646f000000', '6f72675f-6d61-726b-6574-636172000000', 'Contactado/Seguimiento', 'progress', '#6E9BA6', 4, false) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f76-6973-6974-6100-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Visita Agendada', 'progress', '#9C8AAE', 5, false) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f73-696e-5f72-6573-707565737461', '6f72675f-6d61-726b-6574-636172000000', 'Sin Respuesta', 'progress', '#A8896B', 6, true) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f67-616e-6164-6f00-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Ganado', 'exit_won', '#F2F0EC', 7, false) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f64-6573-6361-7274-61646f000000', '6f72675f-6d61-726b-6574-636172000000', 'Descartado', 'exit_lost', '#55555A', 8, false) on conflict (id) do nothing;
insert into stage (id, organization_id, nombre, kind, color, orden, ai_agent_enabled)
   values ('73745f63-6f6e-7369-676e-610000000000', '6f72675f-6d61-726b-6574-636172000000', 'Consigna / Compra', 'progress', '#8FA88F', 9, false) on conflict (id) do nothing;
insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values ('636c5f30-3100-0000-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Alberto Javier Cortez Romero', '13.643.414-4', '+56999970506', 'Antofagasta') on conflict (id) do nothing;
insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values ('636c5f30-3200-0000-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Camila Mac-Donald Vicuna', '18.934.592-5', '56997880793', null) on conflict (id) do nothing;
insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values ('636c5f30-3300-0000-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Juan Jose Valenzuela', null, '+56992609373', null) on conflict (id) do nothing;
insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values ('636c5f30-3400-0000-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Kaufmann', '1-9', '+56987740366', 'Lo Barnechea') on conflict (id) do nothing;
insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values ('636c5f30-3500-0000-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Miguel Khaliliyeh', '6.595.276-9', '+56987740366', 'Lo Barnechea') on conflict (id) do nothing;
insert into client (id, organization_id, nombre, rut, telefono, comuna)
   values ('636c5f30-3600-0000-0000-000000000000', '6f72675f-6d61-726b-6574-636172000000', 'Sebastian Raul Orellana Jimenez', '17.670.938-3', '56961913323', 'Santiago') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3232-313432000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD922142', 'Mercedes Benz GLA 200 1.6 AT año 2016', 'Mercedes Benz', 2016, 16450000, 59000, 'Bencina', 'disponible', 91, now() - interval '12 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3232-303831000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD922081', 'Mercedes Benz E 63 AMG Año 2011', 'Mercedes Benz', 2011, 45950000, 81216, 'Bencina', 'disponible', 91, now() - interval '14 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3232-303438000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD922048', 'RAM 1500 Limited año 2023', 'RAM', 2023, 43950000, 59160, 'Bencina', 'disponible', 91, now() - interval '16 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3232-303138000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD922018', 'Maserati Grecale GT Mild-Hybrid 4x4 año 2024', 'Maserati', 2024, 54450000, 18879, 'Bencina', 'disponible', 100, now() - interval '18 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3232-303134000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD922014', 'Peugeot 5008 Blue HDI 130 1.5 Año 2023', 'Peugeot', 2023, 22250000, 38681, 'Diésel', 'disponible', 91, now() - interval '21 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-393834000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921984', 'FORD Explorer XLT 4x4 año 2023', 'Ford', 2023, 28950000, 71908, 'Bencina', 'disponible', 91, now() - interval '24 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-393733000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921973', 'Peugeot 3008 1.6 GT Hibrido año 2023', 'Peugeot', 2023, 21550000, 48903, 'Híbrido', 'disponible', 91, now() - interval '27 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-393334000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921934', 'JEEP Wrangler 3.6 Unlimited Rubicon 4X4 Año 2013', 'Jeep', 2013, 22950000, 94617, 'Bencina', 'disponible', 91, now() - interval '31 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-393134000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921914', 'Chevrolet Corvette Stingray C3 V8 5.7 Año 1974', 'Chevrolet', 1974, 27950000, 150000, 'Bencina', 'disponible', 100, now() - interval '33 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-393130000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921910', 'AUDI Q3 35 TFSI Sport AT Año 2023', 'Audi', 2023, 28750000, 44271, 'Bencina', 'disponible', 91, now() - interval '35 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-383230000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921820', 'Chevrolet Silverado Trail Boss 5.3 LTS Año 2021', 'Chevrolet', 2021, 31450000, 47739, 'Bencina', 'disponible', 91, now() - interval '38 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-373636000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921766', 'FORD F 150 LARIAT BLACK 5.0 V8 2025 Facturable', 'Ford', 2025, 47450000, 45000, 'Bencina', 'disponible', 97, now() - interval '42 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-373430000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921740', 'CHEVROLET Silverado Diesel 3.0L 4X4 AT 2023', 'Chevrolet', 2023, 51950000, 40500, 'Diésel', 'disponible', 91, now() - interval '45 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-363539000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921659', 'JEEP Grand Cherokee LAREDO 3.6 4x2 2019', 'Jeep', 2019, 18450000, 59000, 'Bencina', 'disponible', 97, now() - interval '52 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-323137000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921217', 'MERCEDES BENZ E 350 Elegance 3.5 V6 AMG 2006', 'Mercedes Benz', 2006, 8450000, 199192, 'Bencina', 'disponible', 97, now() - interval '61 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-303838000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921088', 'RAM 700 1.3 SLT 4X2 CAB. SIM. MT 2P 2025', 'RAM', 2025, 14950000, 12400, 'Bencina', 'disponible', 91, now() - interval '66 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-303734000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921074', 'SUBARU Outback Field Edition 2.5 2024', 'Subaru', 2024, 26950000, 21500, 'Bencina', 'disponible', 91, now() - interval '70 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3231-303032000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD921002', 'NISSAN Pathfinder 3.5 Exclusive 2025', 'Nissan', 2025, 39950000, 15800, 'Bencina', 'disponible', 91, now() - interval '74 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3230-393135000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD920915', 'BMW 530 M Sport 2024', 'BMW', 2024, 52950000, 18200, 'Bencina', 'disponible', 91, now() - interval '112 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3230-393032000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD920902', 'SUBARU Outback Field Edition 2.5 2022', 'Subaru', 2022, 24950000, 48300, 'Bencina', 'disponible', 91, now() - interval '112 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3230-383838000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD920888', 'VOLKSWAGEN Tiguan 2.0 TFSI Highline 2013', 'Volkswagen', 2013, 8950000, 128400, 'Bencina', 'disponible', 91, now() - interval '112 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3230-383731000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD920871', 'BMW X5 M Sport 2024', 'BMW', 2024, 68950000, 14900, 'Bencina', 'disponible', 91, now() - interval '112 days', '{}') on conflict (id) do nothing;
insert into vehicle (id, organization_id, branch_id, codigo, titulo, marca, anio, precio, km, combustible, estado, completitud_pct, publicado_at, tags)
   values ('7665685f-636f-6439-3230-383431000000', '6f72675f-6d61-726b-6574-636172000000', '7375635f-3030-3100-0000-000000000000', 'COD920841', 'AUDI E-Tron Sportback 55 Quattro 2022', 'Audi', 2022, 33950000, 31200, 'Eléctrico', 'disponible', 91, now() - interval '112 days', '{}') on conflict (id) do nothing;
commit;
