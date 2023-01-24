import { getCatalogItemBySKU } from "./helpers.js";

export const updateCart = (req, cart) => {
    // TODO: check stock levels

    // {add: 123} | {minus: 123} | {remove: 123}
    const action = req.body;
    const sku = Number(action.add || action.minus || action.remove);
    if (!cart[sku]) {
        cart[sku] = {
            ...getCatalogItemBySKU(sku),
            amount: 0,
            total: 0
        }
    }

    if (action.add) {
        cart[sku].amount += 1;
    } else if (action.minus) {
        cart[sku].amount -= 1;
    } else if (action.remove) {
        cart[sku].amount = 0;
    }

    if (cart[sku].amount <= 0) {
        delete cart[sku]
    } else {
        cart[sku].total = cart[sku].amount * cart[sku].price;
    }
}