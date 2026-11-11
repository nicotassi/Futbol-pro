-- Códigos de instalación de un solo uso.
select set_config('request.jwt.claim.sub', '', false);

create temp table code as select private.new_setup_code() as value;
grant select on code to service_role, authenticated;

select tests.ok((select value ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' from code), 'el código tiene formato XXXX-XXXX legible');
select tests.ok((select count(*) = 1 and bool_and(code_hash <> (select value from code)) from public.setup_codes), 'en la base se guarda solo el hash del código');

-- Usuarios de la app no pueden ver ni usar códigos.
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.throws('select * from public.setup_codes', '42501', 'la app no puede leer códigos de instalación');
select tests.throws($$select public.consume_setup_code('AAAA-BBBB')$$, '42501', 'la app no puede consumir códigos');
reset role;

set role service_role;
select tests.ok(not public.consume_setup_code('ZZZZ-ZZZZ'), 'un código inventado no sirve');
select tests.ok(public.consume_setup_code(lower((select value from code))), 'el código válido funciona (sin importar mayúsculas)');
select tests.ok(not public.consume_setup_code((select value from code)), 'un código ya usado no sirve de nuevo');
select public.release_setup_code((select value from code));
select tests.ok(public.consume_setup_code((select value from code)), 'si la instalación falla, el código se puede liberar');
reset role;

update public.setup_codes set used_at = null, expires_at = now() - interval '1 minute';
set role service_role;
select tests.ok(not public.consume_setup_code((select value from code)), 'un código vencido no sirve');
reset role;
