export const TIPOS_CONTRATO: Record<string, string> = {
  suministros:                  "Suministros",
  servicios:                    "Servicios",
  obras:                        "Obras",
  concesion_obras:              "Concesión de obras",
  concesion_servicios:          "Concesión de servicios",
  administrativo_especial:      "Administrativo especial",
  privado:                      "Privado",
  patrimonial:                  "Patrimonial",
  servicios_especiales:         "Servicios especiales",
  mixto:                        "Mixto",
  colaboracion_publico_privada: "Colaboración público-privada",
  otros:                        "Otros",
};

// Años disponibles (PLACE tiene datos desde 2014)
const currentYear = new Date().getFullYear();
export const ANIOS: string[] = Array.from(
  { length: currentYear - 2014 + 1 },
  (_, i) => String(currentYear - i)
);
