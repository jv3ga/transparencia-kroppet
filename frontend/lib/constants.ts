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

export const PROCEDIMIENTOS: Record<string, string> = {
  abierto:                    "Abierto",
  simplificado:               "Abierto simplificado",
  simplificado_abreviado:     "Abierto simplificado abreviado",
  restringido:                "Restringido",
  negociado_sin_publicidad:   "Negociado sin publicidad",
  negociado_con_publicidad:   "Negociado con publicidad",
  licitacion_con_negociacion: "Licitación con negociación",
  dialogo_competitivo:        "Diálogo competitivo",
  asociacion_innovacion:      "Asociación para la innovación",
  menor:                      "Contrato menor",
  basado_acuerdo_marco:       "Basado en acuerdo marco",
  sistema_dinamico_adquisicion: "Sistema dinámico de adquisición",
  otros:                      "Otros",
};

// Años disponibles (PLACE tiene datos desde 2014)
const currentYear = new Date().getFullYear();
export const ANIOS: string[] = Array.from(
  { length: currentYear - 2014 + 1 },
  (_, i) => String(currentYear - i)
);
