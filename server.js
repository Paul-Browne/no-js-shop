import express from 'express';
import compression from 'compression';
import cors from "cors";
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

// GLOBALS
import { MEMORY } from './utils/memory.js';

import { setCookieAndInitializeUserConfig } from "./utils/setCookieAndInitializeUserConfig.js";
import { fetchCatalog, fetchProductDetails, fetchStock, updateStock } from "./utils/api.js";
import { genericHTMLContainer, embedHTMLContainer } from "./utils/baseHTML.js";
import { cartesian, removeDuplicates, getProductAvailabilityBySKU } from "./utils/helpers.js"
import { favoriteHTML, cartHTML, checkoutHTML, orderHTML, outOfStockHTML, detailsHTML } from "./utils/templatesHTML.js";
import { updateCart } from "./utils/cart.js";

MEMORY.catalog = await fetchCatalog();
MEMORY.productDetails = await fetchProductDetails();
MEMORY.stockLevels = await fetchStock();

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/images", express.static("src/images", {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days for images
    extensions: ["jpg", "jpeg", "png"]
}));

app.use("/css", express.static("src/css", {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days for css
    extensions: ["css"]
}));

app.use("/", express.static("src/root", {
    // Favicons, browserconfig.xml, site.webmanifest
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
}));


const homePage = (userConfig, catalog = MEMORY.catalog) => {
    const { showAvailability } = userConfig?.tests;

    // TODO: pagiate on mobile to reduce DOM size
    const isMobile = userConfig?.user?.device?.type === "smartphone";

    const brands = removeDuplicates(catalog.map(product => product.brand));

    let brandsStyle = brands.map(el => `[value=${el}]:checked~.container form:not(.brand-${el})`).join(",\n") + "{display:none}";
    brandsStyle += brands.map(el => `[value=${el}]:checked~.container form.brand-${el}`).join(",\n") + "{display:block}";
    brandsStyle += brands.map(el => `[value=${el}]:checked~.filters [for=${el}]:before`).join(",\n") + "{content: 'X: '}";
    const brandsFilterInputs = brands.map(el => `<input class="vis-hid" type="checkbox" id="${el}" value="${el}">`).join("");
    const brandsFilterLabels = brands.map(el => `<label for="${el}">${el}</label>`).join("");

    let productsByName = {};
    catalog.forEach(product => {
        productsByName[product.url] = productsByName[product.url] || [];
        productsByName[product.url].push(product);
    })

    return `
    <iframe title="cart" class="cart" name="cart" src="/cart"></iframe>
    <style>${brandsStyle}</style>
    ${brandsFilterInputs}
    <input type="checkbox" id="filters-toggle" >
    <label for="filters-toggle">filters</label>
    <div class="filters">
        ${brandsFilterLabels}
    </div>
    <section class="container">
    <style>
    ${Object.keys(productsByName).map((product, index) => {
        const productsArray = productsByName[product];
        const combos = productsArray.map(prod => {
            return [prod.storage, prod.color];
        })
        const storageSelect = removeDuplicates(combos.map(p => p[0]));
        const colorsSelect = removeDuplicates(combos.map(p => p[1]));
        const potentialCombos = cartesian(storageSelect, colorsSelect);
        let warningStyles = "";
        if (potentialCombos.length !== combos.length) {
            const nonExistant = potentialCombos.filter(x => !combos.some(y => (y[0] == x[0] && y[1] == x[1])));
            warningStyles = nonExistant.map(el => {
                const selectableIndex = storageSelect.indexOf(el[0]);
                const colorIndex = colorsSelect.indexOf(el[1]);
                return `
#storage_${index}-${selectableIndex}:checked~.colors [for="color_${index}-${colorIndex}"]{pointer-events:none;}
#storage_${index}-${selectableIndex}:checked~.colors [for="color_${index}-${colorIndex}"]:after{content:"";}
#storage_${index}-${selectableIndex}:checked~#color_${index}-${colorIndex}:checked~.visible-when-unavailable{display:block;}
#storage_${index}-${selectableIndex}:checked~#color_${index}-${colorIndex}:checked~.visible-when-available{display:none;}`
            }).join("\n");
        }
        return warningStyles;
    }).join("")}
    </style>

    ${Object.keys(productsByName).map((product, index) => {
        const productsArray = productsByName[product];

        const brand = productsArray[0].brand;
        const os = productsArray[0].os;

        const combos = productsArray.map(prod => {
            return [prod.storage, prod.color];
        })
        const storageSelect = removeDuplicates(combos.map(p => p[0]));
        const colorsSelect = removeDuplicates(combos.map(p => p[1]));
        const potentialCombos = cartesian(storageSelect, colorsSelect);

        const descs = potentialCombos.map((el, ind) => {
            const prod = productsArray.filter(item => {
                return item.storage === el[0] && item.color === el[1];
            })[0];

            const selectableIndex = storageSelect.indexOf(el[0]);
            const colorIndex = colorsSelect.indexOf(el[1]);

            return prod ? `
            <div class="details storage color storage-${selectableIndex} color-${colorIndex}">
                <img src="/images/height-350px/${prod.url}-${prod.color}" ${index > 5 ? `loading="lazy"` : ""} alt="${prod.name} ${prod.color}">
                <h2>${prod.name} <small>${el[0]}Gb</small></h2>
                <h3>${prod.price}€ ${prod.saving ? `<span class="reduced-from">${prod.price + prod.saving}€</span>` : ""}</h3>
                <p class="monthly">or ${(prod.price / 36).toFixed(2)}€/month for 36 months</p>
                ${showAvailability ? `<p class="availability">${getProductAvailabilityBySKU(prod.sku).available} available</p>` : ""}
            </div>` : `
            <div class="details storage color storage-${selectableIndex} color-${colorIndex} unavailable">
                <img src="/images/height-350px/${product}-${el[1]}" ${index > 5 ? `loading="lazy"` : ""} alt="${productsArray[0].name} ${el[1]} unavailable">
                <h2>${productsArray[0].name} <small>${el[0]}Gb</small></h2>
                <h3>Unavailable</h3>
            </div>`;
        }).join("")

        const addToCart = sku => `<button name="add" value="${sku}" class="btn">add to cart</button>`;

        const addToCarts = potentialCombos.map((el, ind) => {
            const prod = productsArray.filter(item => {
                return item.storage === el[0] && item.color === el[1];
            })[0];

            const selectableIndex = storageSelect.indexOf(el[0]);
            const colorIndex = colorsSelect.indexOf(el[1]);

            return prod ? `
            <div class="right add-to-cart storage color storage-${selectableIndex} color-${colorIndex}">
                <embed style="display:none;" class="favourite" src="/favourite?url=${product}" >
                ${addToCart(prod.sku)}
            </div>` : `
            <div class="right add-to-cart storage color storage-${selectableIndex} color-${colorIndex} unavailable">
                <embed style="display:none;" class="favourite" src="/favourite?url=${product}" >
                ${addToCart()}
            </div>`;
        }).join("")

        // const savings = productsArray.map(prod => {
        //     const selectable = (prod["ram/storage"] || prod.storage).toString().replace("/", "-");
        //     return prod.saving ? `<span class="saving id_${index}-${selectable}-${prod.color}">save ${prod.saving}€</span>` : "";
        // }).join("");

        return `
        <form class="card brand-${brand} os-${os} " method="post" action="/cart" target="cart">
            <a class="card-inner" href="#${product}" id="${product}">
                <div class="card-content">
                    ${storageSelect.length > 1 ? storageSelect.map((el, i) => `<input class="vis-hid storage-${i}" id="storage_${index}-${i}" name="storage_${index}" value="${el}" ${i == 0 ? "checked" : ""} type="radio" aria-label="storage ${el} gigabytes" >`).join("") : ""}
                    ${colorsSelect.length > 1 ? colorsSelect.map((el, i) => `<input class="vis-hid color-${i} ${el}" id="color_${index}-${i}" name="color_${index}" value="${el}" ${i == 0 ? "checked" : ""} type="radio" aria-label="color ${el}" >`).join("") : ""}
                    ${descs}
                    <embed style="display:none;" class="product-details" src="/details?url=${product}" >
                    ${storageSelect.length > 1 ? `<div class="right select-container storages">${storageSelect.map((el, i) => `<label class="storage-select storage-${i}" for="storage_${index}-${i}">${el}</label>`).join(" ")}</div>` : ""}
                    ${colorsSelect.length > 1 ? `<div class="right select-container colors">${colorsSelect.map((el, i) => `<label class="color-select color-${i} ${el}" for="color_${index}-${i}"></label>`).join(" ")}</div>` : ""}
                    ${addToCarts}
                </div>
            </a>
            <a class="close" href="#!"></a>
            <a class="close-out" href="#!"></a>
        </form>         
        `;
    }).join("")}
    </section>`
}


/*************/
/*  HOMEPAGE */
/*************/

app.get('/', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const content = homePage(userConfig);
    res.send(genericHTMLContainer({ url: "/", userConfig, content, timeStamp }));
})

/*************/
/*  TRACKING */
/*************/

app.get('/track', (req, res) => {
    const { action, url, sku, start } = req?.query;
    const t = Math.round(Date.now() / 1000);
    if (action) {
        const userConfig = setCookieAndInitializeUserConfig(req, res);
        userConfig.tracking.lastActive = t;
        if (action == "pageview" && url) {
            userConfig.tracking.viewedPages[url] = t;
        }
        if (action == "productview" && sku) {
            userConfig.tracking.viewedProducts[sku] = t;
        }
        if (action == "pageloaded" && url && start) {
            MEMORY.stats.pageLoads[url] = MEMORY.stats.pageLoads[url] || [];
            const loadTime = Date.now() - start;
            MEMORY.stats.pageLoads[url].push(loadTime);
        }
    }
    res.send("");
})

app.get('/debug', (req, res) => {
    res.json({ MEMORY });
})

app.get('/manual-update-catalog', async (req, res) => {
    // TODO: password protect
    MEMORY.catalog = await fetchCatalog();
    res.json(MEMORY.catalog);
})

app.get('/manual-update-stock', async (req, res) => {
    // TODO: password protect
    MEMORY.stockLevels = await fetchStock();
    res.json(MEMORY.stockLevels);
})


/*************/
/*    CART   */
/*************/

app.post('/cart', (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    updateCart(req, cart);
    res.send(embedHTMLContainer(cartHTML(cart)));
})

app.get('/cart', (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    res.send(embedHTMLContainer(cartHTML(cart)));
})

/*************/
/*  CHECKOUT */
/*************/

app.get('/checkout', (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    res.send(embedHTMLContainer(checkoutHTML(cart)));
})

app.post('/purchase', async (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    MEMORY.stockLevels = await fetchStock();
    let canPurchase = true;
    const itemsOutOfStock = {};
    Object.keys(cart).forEach(sku => {
        const amountInStock = MEMORY.stockLevels[sku] || 0;
        const { amount } = cart[sku];
        if (amount <= amountInStock) {
            MEMORY.stockLevels[sku] = MEMORY.stockLevels[sku] - amount;
        } else {
            canPurchase = false;
            itemsOutOfStock[sku] = {
                ...cart[sku],
                availableAmount: MEMORY.stockLevels[sku]
            }
        }
    })
    if (canPurchase) {
        MEMORY.stockLevels = await updateStock(MEMORY.stockLevels);
        res.send(embedHTMLContainer(orderHTML(cart)));
    } else {
        res.send(embedHTMLContainer(outOfStockHTML(itemsOutOfStock, cart)));
    }
})

/*************/
/* FAVORITES */
/*************/

app.get('/favourite', (req, res) => {
    const url = req?.query?.url;
    if (url) {
        const userConfig = setCookieAndInitializeUserConfig(req, res);
        const action = userConfig.favourites.includes(url) ? "remove" : "add";
        res.send(embedHTMLContainer(favoriteHTML(url, action)));
    } else {
        res.send("");
    }
})

app.post('/favourite', (req, res) => {
    const { url, action } = req?.body;
    if (action && url) {
        const userConfig = setCookieAndInitializeUserConfig(req, res);
        if (action == "add") {
            userConfig.favourites.push(url);
        } else if (action == "remove") {
            userConfig.favourites = userConfig.favourites.filter(fave => fave !== url);
        }
        res.send(embedHTMLContainer(favoriteHTML(url, action == "add" ? "remove" : "add")));
    } else {
        res.send("");
    }
})

app.get('/favourites', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const favorited = MEMORY.catalog.filter(product => userConfig.favourites.includes(product.url))
    const content = homePage(userConfig, favorited);
    res.send(genericHTMLContainer({ url: "/favourites", userConfig, content, timeStamp }));
})


/*************/
/*  DETAILS  */
/*************/

app.get('/details', (req, res) => {
    const url = req?.query?.url;
    if (url) {
        const details = MEMORY.productDetails[url];
        if (details) {
            res.send(embedHTMLContainer(detailsHTML(details)));
        } else {
            res.send("");
        }
    } else {
        res.send("");
    }
})

/*************/
/*    CMS    */
/*************/


const formCreatorRecursor = (val, id = "") => {
    //const id = (prev ? (prev + "-") : "") + (key ? (index + "-" + key) : "");
    const type = typeof val;
    if (type === "object") {
        if (Array.isArray(val)) {
            return val.map((element, ind) => {
                return `<br><span>${ind}</span>${formCreatorRecursor(element, id + "[" + ind + "]")}`;
            }).join("");
        } else {
            return Object.keys(val).map((k) => {
                const value = val[k];
                return `<div><span>${k}</span>${formCreatorRecursor(value, (id ? (id + ".") : "") + k)}</div>`;
            }).join("");
        }
    } else {
        if (type === 'number') {
            return `<label><input name="${id}" type="number" value="${val}" ></label><br>`;
        } else if (type === 'boolean') {
            return `<label><input name="${id}" type="checkbox" ${val ? "checked" : ""} ></label><br>`;
        } else if (type === 'string') {
            return `<label><input name="${id}" type="text" value="${val}" ></label><br>`;
        } else {
            // undefined, null...
            return `<label><input name="${id}" type="text" value="${val}" ></label><br>`;
        }
    }
}

app.get('/edit', (req, res) => {
    // TODO: password protect
    const html = MEMORY.catalog.map((product, i) => {
        const form = formCreatorRecursor(product, `MEMORY.catalog[${i}]`);
        return `<form method="POST" action="/edit">${form}<button type="submit">update</button></form>`;
    }).join("");
    const content = `
        <style>
            div{
                padding-left: 20px;
            }
        </style>
        ${html}
    `;
    res.send(embedHTMLContainer(content));
})

app.post('/edit', async (req, res) => {
    // TODO: password protect

    console.log(req?.body);

    // const html = MEMORY.catalog.map((product, i) => {
    //     const items = Object.keys(product).map((key, j) => {
    //         const value = product[key];
    //         const type = typeof value;  // 'string', 'boolean', 'number'
    //         const inputType = type == 'number' ? "number" : (type == 'boolean' ? "checkbox" : 'text');
    //         return `<label>${key}<input name="item-${i}-${j}" type="${inputType}" value="${value}" ></label><br>`;
    //     }).join("");
    //     return `<div>${items}</div><br>`;
    // }).join("");
    // const content = `<form method="POST" action="/edit">${html}</form>`;
    // res.send(embedHTMLContainer(content));

    res.json(req?.body);
})

app.listen(8080, () => console.log("http://localhost:8080"));

