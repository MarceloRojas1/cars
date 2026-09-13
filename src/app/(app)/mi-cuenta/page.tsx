import { PageHeader } from "@/components/page-header";
import { FormularioPerfil, FormularioPassword } from "@/components/cuenta/formularios";
import { getBranches, getCurrentUser, getOrganization } from "@/lib/data";
import { sesionActual } from "@/lib/auth/sesion";

export const metadata = { title: "Mi cuenta" };

const ROL_TEXTO: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  vendedor: "Vendedor",
};

export default async function MiCuentaPage() {
  const [yo, org, sucursales, sesion] = await Promise.all([
    getCurrentUser(), getOrganization(), getBranches(), sesionActual(),
  ]);

  const sucursal = sucursales.find((b) => b.id === yo.branchId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Mi cuenta"
        descripcion="Tus datos y tu acceso"
      />

      <section className="mb-9">
        <h2 className="etiqueta mb-4">Tus datos</h2>
        <FormularioPerfil nombre={yo.nombre} telefono={yo.telefono} />
      </section>

      {/*
        * Lo que NO se edita acá vive junto a lo que sí, y dice quién lo cambia.
        * Sin esto la pantalla parece incompleta; con esto queda claro que el
        * rol y la sucursal los administra el dueño, no uno mismo.
        */}
      <section className="mb-9 border-y border-border py-5">
        <h2 className="etiqueta mb-4">Tu lugar en {org.nombre}</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[11.5px] text-muted-foreground">Correo</dt>
            <dd className="mt-1 truncate text-[13.5px]">{yo.email}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-muted-foreground">Rol</dt>
            <dd className="mt-1 text-[13.5px]">
              {ROL_TEXTO[sesion?.rol ?? yo.rol] ?? yo.rol}
            </dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-muted-foreground">Sucursal</dt>
            <dd className="mt-1 text-[13.5px]">{sucursal?.nombre ?? "Sin asignar"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          El correo, el rol y la sucursal los administra el dueño de la cuenta desde
          Equipo. Si algo está mal, pídeselo a quien administra {org.nombre}.
        </p>
      </section>

      <section>
        <h2 className="etiqueta mb-4">Contraseña</h2>
        {sesion ? (
          <FormularioPassword />
        ) : (
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Estás trabajando sin iniciar sesión (modo desarrollo), así que no hay
            contraseña que cambiar.
          </p>
        )}
      </section>
    </div>
  );
}
