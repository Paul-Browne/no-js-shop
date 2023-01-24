import { MEMORY } from "./memory.js";

export const removeDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) === index);
export const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
export const getCatalogItemBySKU = sku => MEMORY.catalog.filter(prod => prod.sku === sku)[0];
export const getProductAvailabilityBySKU = sku => {
    const product = getCatalogItemBySKU(sku);
    const available = MEMORY.stockLevels[sku] || 0;
    return {
        available,
        inCatalog: !!product,
        inStock: !!available
    }
}