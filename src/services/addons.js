/**
 * Extras que se pueden sumar al turno. El storefront es el que cotiza, así que
 * este catálogo es la única fuente de precios: la API guarda lo que recibe.
 */
const ADDONS = [
  {
    code: 'clase-previa',
    label: 'Clase previa de 30 min',
    description: 'Media hora con el instructor en el circuito antes de rendir.',
    price: 9000
  },
  {
    code: 'simulacro-teorico',
    label: 'Simulacro teórico guiado',
    description: 'Repaso del examen teórico con corrección explicada.',
    price: 4500
  },
  {
    code: 'seguro-ampliado',
    label: 'Seguro ampliado',
    description: 'Cobertura sin franquicia por daños durante el examen.',
    price: 7000
  }
];

const BY_CODE = new Map(ADDONS.map((addon) => [addon.code, addon]));

function normalizeCodes(input) {
  const list = Array.isArray(input) ? input : [input];
  const seen = new Set();
  list.forEach((value) => {
    if (typeof value === 'string' && BY_CODE.has(value)) {
      seen.add(value);
    } else if (value && typeof value === 'object' && BY_CODE.has(value.code)) {
      seen.add(value.code);
    }
  });
  return ADDONS.filter((addon) => seen.has(addon.code)).map((addon) => addon.code);
}

/**
 * Convierte los códigos elegidos en la lista de add-ons con precios y subtotal.
 */
function selectAddons(input) {
  const codes = normalizeCodes(input);
  const selected = codes.map((code) => {
    const addon = BY_CODE.get(code);
    return { code: addon.code, label: addon.label, price: addon.price };
  });
  return {
    codes,
    selected,
    total: selected.reduce((sum, addon) => sum + addon.price, 0)
  };
}

function addonsCatalog(codes) {
  const active = new Set(normalizeCodes(codes));
  return ADDONS.map((addon) => ({ ...addon, checked: active.has(addon.code) }));
}

module.exports = { ADDONS, selectAddons, addonsCatalog, normalizeCodes };
