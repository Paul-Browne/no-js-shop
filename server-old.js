import express from 'express';
import compression from 'compression';
import cors from "cors";
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import got from 'got';
import DeviceDetector from "device-detector-js";
import { v4 } from 'uuid';

import { genericHTMLContainer, embedHTMLContainer, localStock, localCatalog } from "./src/exports.js";

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

//app.set('etag', false);

let catalog = await fetchCatalog();
let stockLevels = await fetchStock();
let stats = {
    pageLoads: {}
}
setInterval(async () => {
    catalog = await fetchCatalog();
    //stockLevels = await fetchStock();
}, 1000 * 60 * 15)

const getCatalogItemBySKU = sku => catalog.filter(prod => prod.variants.filter(variant => variant.sku == sku).length)[0];

const cartHTML = cartProducts => {
    const products = Object.values(cartProducts);     // array of products
    return `
    <h1>your shopping cart</h1>
    ${products.map(product => {
        return `
        <div>
            <p>${product.name}, ${product.amount}</p>
            <form method="post" action="/cart">
                <button name="minus" value="${product.uid}" type="submit">-1</button>
                <button name="remove" value="${product.uid}" type="submit">remove</button>
                <button name="add" value="${product.uid}" type="submit">+1</button>
            </form>
        </div>`
    }).join("")}
    `;
};

const inlineCart = cartProducts => {
    const products = Object.values(cartProducts);     // array of products
    let totals = {
        1: 0,
        12: 0,
        24: 0,
        36: 0
    }
    const items = products.map(product => {
        const period = product.months;
        totals[period] = totals[period] + product.total;
        return `
        <div>
            <p>${product.name}, ${product.amount} x ${product.price} = ${product.total}</p>
            <form method="post" action="/inline-cart">
                <input type="hidden" name="sku" value="${product.sku}" >
                <input type="hidden" name="price" value="${product.months}" >
                <button name="action" value="minus" type="submit">-1</button>
                <button name="action" value="remove" type="submit">remove</button>
                <button name="action" value="add" type="submit">+1</button>
            </form>
        </div>
        `
    }).join("");

    return items + `
    <div>1: ${totals[1]}</div>
    <div>12: ${totals[12]}</div>
    <div>24: ${totals[24]}</div>
    <div>36: ${totals[36]}</div>`
};

const removeDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) === index);
const unique = (arr, keys) => arr.filter((v, i, a) => a.findIndex(v2 => keys.every(k => v2[k] === v[k])) === i)
const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));

const homePageVersionTwo = userConfig => {
    const ipo = userConfig?.tests?.initialPaymentOption;

    let productsByName = {};
    catalog.forEach(product => {
        productsByName[product.url] = productsByName[product.url] || [];
        productsByName[product.url].push(product);
    })

    return `

    <style>
        .visible-when-available{
            display: initial;
        }
        .details,
        .saving,
        .visible-when-unavailable{
            display: none;
        }
        .saving{
            position: absolute;
            top: 0;
            right: 0;
            padding: 10px;
            padding: 4px;
            margin: 10px;
            background: orange;
            color: #fff;
            font-size: 14px;
            border-radius: 4px;
            font-weight: 500;
            letter-spacing: 0.3px;
        }
        .card-inner:target .saving {
            display: none!important;
        }
        .visible-when-unavailable button{
            opacity: 0.5;
            cursor: not-allowed;
        }
        .selection-unavailable{
            font-size: 12px;
            line-height: 14px
        }
        .select-container{
            display: flex;
            align-items: center;
        }
        .storage-select{
            display: inline-block;
            border-radius: 4px;
            margin-left: 9px;
            background: #ddd;
            font-size: 13px;
            line-height: 20px;
            padding: 2px 4px;
        }
        label.color-select{
            position: relative;
            overflow: hidden;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            margin-left: 9px;
        }
        .select-container.storages,
        .select-container.colors{
            margin-bottom: 9px;
        }        
        label.color-select:before,
        label.color-select:after{    
            position: absolute;
            top: 5%;
            left: 5%;
            width: 90%;
            height: 90%;
        } 
        label.color-select:after{    
            background: linear-gradient(45deg, transparent 0 45%, red 45% 55%, transparent 55% 100%), linear-gradient(-45deg, transparent 0 45%, red 45% 55%, transparent 55% 100%);
        }
        .reduced-from{
            position: relative;
            font-weight: 400;
            font-size: 16px;
            color: #666;
            text-decoration: none;
        }
        .reduced-from:after{
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            border-radius: 5px;
            left: 0;
            background: linear-gradient(to top left, transparent 0 46%, #ff0000b8 46% 54%, transparent 54% 100%);
        }
    </style>
    <style>
        .close-modal,
        .modal{
            display: none;   
        }

        #toggle-modal:checked~.close-modal,
        #toggle-modal:checked~.modal{
            display: block;
        }
        .open-modal{
            display:flex;
            background:none;
            margin:0;
            padding:0;
            border:0;
            margin-bottom: auto;
        }
        .label-modal{
            display: block;
        }
        .label-modal *{
            pointer-events: none;
        }
        .variable{
            display: none;
        }

        .st-0:checked~.open-modal .st-0{display:block}
        .st-1:checked~.open-modal .st-1{display:block}
        .st-2:checked~.open-modal .st-2{display:block}
        .st-3:checked~.open-modal .st-3{display:block}
        .st-4:checked~.open-modal .st-4{display:block}
        .st-5:checked~.open-modal .st-5{display:block}
        .col-0:checked~.open-modal .col-0{display:block}
        .col-1:checked~.open-modal .col-1{display:block}
        .col-2:checked~.open-modal .col-2{display:block}
        .col-3:checked~.open-modal .col-3{display:block}
        .col-4:checked~.open-modal .col-4{display:block}
        .col-5:checked~.open-modal .col-5{display:block}

        .st-0:checked~.open-modal .storage:not(.st-0){display:none;}
        .st-1:checked~.open-modal .storage:not(.st-1){display:none;}
        .st-2:checked~.open-modal .storage:not(.st-2){display:none;}
        .st-3:checked~.open-modal .storage:not(.st-3){display:none;}
        .st-4:checked~.open-modal .storage:not(.st-4){display:none;}
        .st-5:checked~.open-modal .storage:not(.st-5){display:none;}
        .col-0:checked~.open-modal .color:not(.col-0){display:none;}
        .col-1:checked~.open-modal .color:not(.col-1){display:none;}
        .col-2:checked~.open-modal .color:not(.col-2){display:none;}
        .col-3:checked~.open-modal .color:not(.col-3){display:none;}
        .col-4:checked~.open-modal .color:not(.col-4){display:none;}
        .col-5:checked~.open-modal .color:not(.col-5){display:none;}
    
    </style>

    <style>
    ${Object.keys(productsByName).map((product, index) => {
        const productsArray = productsByName[product];
        const combos = productsArray.map(prod => {
            const selectable = prod["ram/storage"] || prod.storage;
            return [selectable, prod.color];
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
    }).join("\n")}
    </style>    

    <iframe class="cart" name="cart"></iframe>

    <input class="vis-hid" type="checkbox" id="toggle-modal">
    <iframe class="modal" name="modal"></iframe>
    <label class="close-modal" for="toggle-modal">close</label>

    <section class="container">   

    ${Object.keys(productsByName).map((product, index) => {

        const productsArray = productsByName[product];
        const combos = productsArray.map(prod => {
            const selectable = prod["ram/storage"] || prod.storage;
            return [selectable, prod.color];
        })
        const storageSelect = removeDuplicates(combos.map(p => p[0]));
        const colorsSelect = removeDuplicates(combos.map(p => p[1]));
        const potentialCombos = cartesian(storageSelect, colorsSelect);

        const descs = potentialCombos.map((el, ind) => {
            const prod = productsArray.filter(item => {
                const selectable = item["ram/storage"] || item.storage;
                return selectable === el[0] && item.color === el[1];
            })[0];

            const selectableIndex = storageSelect.indexOf(el[0]);
            const colorIndex = colorsSelect.indexOf(el[1]);

            return prod ? `
            <div class="details variable storage color st-${selectableIndex} col-${colorIndex}">
                <img src="/images/${prod.url}-${prod.color}" loading="lazy" >
                <h3>${prod.name}</h3>
                <h2>${prod.price}€ ${prod.saving ? `<span class="reduced-from">${prod.price + prod.saving}€</span>` : ""}</h2>
            </div>` : `
            <div class="details variable storage color st-${selectableIndex} col-${colorIndex} unavailable">
                <img src="/images/${product}-${el[1]}" loading="lazy" >
                <h3>${productsArray[0].name}</h3>
                <h2>Unavailable</h2>
            </div>`;
        }).join("")


        return `<form class="form-modal card" method="post" action="/v2-modal" target="modal">
            <input name="product" value="${product}" type="hidden">
            <div class="card-inner">
                <div class="card-content">
                    ${storageSelect.map((el, i) => `<input id="storage_${index}-${i}" class="vis-hid st-${i}" name="storage_${index}" value="${el}" type="radio" ${i == 0 ? "checked" : ""} >`).join("")}
                    ${colorsSelect.map((el, i) => `<input id="color_${index}-${i}" class="vis-hid col-${i} ${el}" name="color_${index}" value="${el}" type="radio" ${i == 0 ? "checked" : ""} >`).join("")}
            
                    <button class="open-modal">
                        <label class="label-modal" for="toggle-modal">
                            ${descs}
                        </label>
                    </button>

                    <div class="right select-container storages">
                        ${storageSelect.map((el, i) => `<label class="storage-select st-${i}" for="storage_${index}-${i}">${el}</label>`).join("")}
                    </div>
                    <div class="right select-container colors">
                        ${colorsSelect.map((el, i) => `<label class="color-select col-${i} ${el}" for="color_${index}-${i}"></label>`).join("")}
                    </div>

                    <button type="submit" formtarget="cart" formaction="/v2-cart">add to cart</button>
                </div>
            </div>
        </form>`
    }).join("")}
    </section>`
}

const homePage = userConfig => {
    const ipo = userConfig?.tests?.initialPaymentOption;

    let productsByName = {};
    catalog.forEach(product => {
        productsByName[product.url] = productsByName[product.url] || [];
        productsByName[product.url].push(product);
    })

    // let allColours = [];
    // Object.values(productsByName).forEach((products, index) => {
    //     products.forEach(product => {
    //         allColours.push(product.color);
    //     })
    // })
    // const uniqueColors = removeDuplicates(allColours);


    return `
    <input class="cart" type="checkbox">
    <iframe src="/inline-cart" name="inline-cart" class="inline-cart" ></iframe>
    <input class="apple-filter" type="checkbox">Apple
    <input class="samsung-filter" type="checkbox">Samsung
    <input class="nokia-filter" type="checkbox">Nokia
    <input class="xiaomi-filter" type="checkbox">Xiaomi
    <br>
    <input name="storage" class="storage-any-filter" type="radio">Any
    <input name="storage" class="storage-32-filter" type="radio">32 Gt
    <input name="storage" class="storage-64-filter" type="radio">64 Gt
    <input name="storage" class="storage-128-filter" type="radio">128 Gt
    <input name="storage" class="storage-256-filter" type="radio">256 Gt
    <input name="storage" class="storage-512-filter" type="radio">512 Gt
    <input name="storage" class="storage-1000-filter" type="radio">1 T
    <br>
    <input class="discount-filter" type="checkbox">on offer
    <section class="container">
    <style>
        .visible-when-available{
            display: initial;
        }
        .details,
        .saving,
        .visible-when-unavailable{
            display: none;
        }
        .saving{
            position: absolute;
            top: 0;
            right: 0;
            padding: 10px;
            padding: 4px;
            margin: 10px;
            background: orange;
            color: #fff;
            font-size: 14px;
            border-radius: 4px;
            font-weight: 500;
            letter-spacing: 0.3px;
        }
        .card-inner:target .saving {
            display: none!important;
        }
        .visible-when-unavailable button{
            opacity: 0.5;
            cursor: not-allowed;
        }
        .selection-unavailable{
            font-size: 12px;
            line-height: 14px
        }
        .select-container{
            display: flex;
            align-items: center;
        }
        .storage-select{
            display: inline-block;
            border-radius: 4px;
            margin-left: 9px;
            background: #ddd;
            font-size: 13px;
            line-height: 20px;
            padding: 2px 4px;
        }
        label.color-select{
            position: relative;
            overflow: hidden;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            margin-left: 9px;
        }
        .select-container.storages,
        .select-container.colors{
            margin-bottom: 9px;
        }        
        label.color-select:before,
        label.color-select:after{    
            position: absolute;
            top: 5%;
            left: 5%;
            width: 90%;
            height: 90%;
        } 
        label.color-select:after{    
            background: linear-gradient(45deg, transparent 0 45%, red 45% 55%, transparent 55% 100%), linear-gradient(-45deg, transparent 0 45%, red 45% 55%, transparent 55% 100%);
        }
        .reduced-from{
            position: relative;
            font-weight: 400;
            font-size: 16px;
            color: #666;
            text-decoration: none;
        }
        .reduced-from:after{
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            border-radius: 5px;
            left: 0;
            background: linear-gradient(to top left, transparent 0 46%, #ff0000b8 46% 54%, transparent 54% 100%);
        }                

    ${Object.keys(productsByName).map((product, index) => {
        const productsArray = productsByName[product];
        const combos = productsArray.map(prod => {
            const selectable = prod["ram/storage"] || prod.storage;
            return [selectable, prod.color];
        })
        const storageSelect = removeDuplicates(combos.map(p => p[0]));
        const colorsSelect = removeDuplicates(combos.map(p => p[1]));
        const potentialCombos = cartesian(storageSelect, colorsSelect);

        let warningStyles = "";
        if (potentialCombos.length !== combos.length) {
            const nonExistant = potentialCombos.filter(x => !combos.some(y => (y[0] == x[0] && y[1] == x[1])));
            warningStyles = nonExistant.map(el => {
                const storage = el[0].toString().replace("/", "-");
                const color = el[1];
                return `#id_${index}-${storage}:checked~div [for="id_${index}-${color}"]{pointer-events:none;}
#id_${index}-${storage}:checked~div [for="id_${index}-${color}"]:after{content:"";}
#id_${index}-${storage}:checked~#id_${index}-${color}:checked~.visible-when-unavailable{display:block;}
#id_${index}-${storage}:checked~#id_${index}-${color}:checked~.visible-when-available{display:none;}`
            }).join("\n");
        }

        const styles = potentialCombos.map(el => {
            const st = el[0].toString().replace("/", "-");
            const col = el[1];
            return `#id_${index}-${st}:checked~#id_${index}-${col}:checked~.id_${index}-${st}-${col}`
        }).join(",\n") + "{display:block;}";

        return `${styles}
${warningStyles}`;

    }).join("\n")}
    </style>

    ${Object.keys(productsByName).map((product, index) => {
        const productsArray = productsByName[product];
        const combos = productsArray.map(prod => {
            const selectable = prod["ram/storage"] || prod.storage;
            return [selectable, prod.color]
        })
        const storageSelect = removeDuplicates(combos.map(p => p[0]));
        const colorsSelect = removeDuplicates(combos.map(p => p[1]));
        const potentialCombos = cartesian(storageSelect, colorsSelect);

        const descs = potentialCombos.map((el, ind) => {
            const selectable = el[0].toString().replace("/", "-");
            const prod = productsArray.filter(item => {
                const selectable = item["ram/storage"] || item.storage;
                return selectable === el[0] && item.color === el[1];
            })[0];

            //TODO: Replace gallery with embed

            return prod ? `
            <div class="details id_${index}-${selectable}-${prod.color}">
                
                ${prod.media?.length ? `
                    <section class="gallery">
                        <input class="vis-hid img-1" id="id_${index}-${ind}-1" name="gallery_${index}-${ind}" type="radio" checked >
                        ${prod.media.map((el, i) => `<input class="vis-hid img-${i + 2}" id="id_${index}-${ind}-${i + 2}" name="gallery_${index}-${ind}" type="radio" >`).join("")}
                        <div class="images img-1">
                            <label class="content" for="id_${index}-${ind}-${prod.media.length + 1}">previous</label>
                            <img class="content" loading="lazy" src="/images/${prod.url}-${prod.color}">
                            <label class="content" for="id_${index}-${ind}-2">next</label>
                        </div>
                        ${prod.media.map((el, i) => `<div class="images img-${i + 2}">
                            <label class="content" for="id_${index}-${ind}-${i + 1}">previous</label>
                            ${el.type === "image" ? `<img class="content" loading="lazy" src="/images/${el.url}">` : `<video fullscreen controls class="content" src="/images/${el.url}"></video>`}
                            <label class="content" for="id_${index}-${ind}-${(i + 1) == prod.media.length ? 1 : (i + 3)}">next</label>
                        </div>`).join("")}
                        <div>
                            <label for="id_${index}-${ind}-1">image 1</label>
                            ${prod.media.map((el, i) => `<label for="id_${index}-${ind}-${i + 2}">image ${i + 2}</label>`).join("")}
                        </div>
                    </section> ` : ``
                }
                <img src="/images/${prod.url}-${prod.color}" loading="lazy" >
             



                <h3>${prod.name}</h3>
                <h2>${prod.price}€ ${prod.saving ? `<span class="reduced-from">${prod.price + prod.saving}€</span>` : ""}</h2>
            </div>` : `
            <div class="details unavailable id_${index}-${selectable}-${el[1]}">
                <img src="/images/${product}-${el[1]}" loading="lazy" >
                <h3>${productsArray[0].name}</h3>
                <h2>Unavailable</h2>
            </div>`;
        }).join("")

        const savings = productsArray.map(prod => {
            const selectable = (prod["ram/storage"] || prod.storage).toString().replace("/", "-");
            return prod.saving ? `<span class="saving id_${index}-${selectable}-${prod.color}">save ${prod.saving}€</span>` : "";
        }).join("");

        let addToCart = `<button class="btn">add to cart</button>`;

        return `
        <form class="card" method="post" action="/inline-cart" target="inline-cart">     
            <a class="card-inner" href="#${product}" id="${product}">
                <div class="card-content">

                    ${storageSelect.map((el, i) => `
                        <input class="vis-hid ss-${i}" id="id_${index}-${el.toString().replace("/", "-")}" name="id_${index}-storage" ${i == 0 ? "checked" : ""} type="radio">`).join("")}
                    ${colorsSelect.map((el, i) => `
                        <input class="vis-hid cs-${i} ${el}" id="id_${index}-${el}" name="id_${index}-color" ${i == 0 ? "checked" : ""} type="radio">`).join("")}

                    ${savings}
                    ${descs}                   

                    ${storageSelect.length > 1 ? `<div class="right select-container storages">${storageSelect.map((el, i) => `<label class="storage-select ss-${i}" for="id_${index}-${el.toString().replace("/", "-")}">${el}</label>`).join(" ")}</div>` : ""}
                    ${colorsSelect.length > 1 ? `<div class="right select-container colors">${colorsSelect.map((el, i) => `<label class="color-select cs-${i} ${el}" for="id_${index}-${el}"></label>`).join(" ")}</div>` : ""}

                    <div class="right visible-when-available">
                        ${addToCart}
                        <embed style="display:none;" class="favourite" src="/favourite?url=${product}" >
                    </div>                    
                    <div class="right visible-when-unavailable">
                        ${addToCart}
                    </div>

                </div>
            </a>
            <a class="close" href="#!"></a>
            <a class="close-out" href="#!"></a>
        </form>         
        `;
    }).join("")}
    </section>`
}


const productPage = url => {
    return `
    <input type = "checkbox">
    <iframe src="/inline-cart" name="inline-cart"></iframe>
    <form method="post" action="/inline-cart" target="inline-cart">
    ${catalog.filter(product => url == product.url).map(product => {
        return `
        <h2>${product.name}</h2>
        <img src="/images/${product.uid}" loading="lazy" width="500">
        <p>${product.price.toFixed(2)}€</p>
        <button name="${product.uid}" value="add" type="submit">add to cart</button>
    `;
    }).join("")}
    </form>`
};


const inMemoryDatabase = {};

const setCookieAndInitializeUserConfig = (req, res) => {
    const id = req?.cookies?.id;
    if (id && inMemoryDatabase[id]) {
        return inMemoryDatabase[id];
    } else {
        const UUID = v4();
        const options = {
            maxAge: 1000 * 60 * 60 * 24 * 30, // would expire after 30 days
            httpOnly: true, // The cookie only accessible by the web server
            signed: false // Indicates if the cookie should be signed
        }
        res.cookie('id', UUID, options);
        let initialPaymentOption = Math.random();
        if (initialPaymentOption < 0.25) {
            initialPaymentOption = 1;
        } else if (initialPaymentOption < 0.5) {
            initialPaymentOption = 12;
        } else if (initialPaymentOption < 0.75) {
            initialPaymentOption = 24;
        } else {
            initialPaymentOption = 36;
        }

        const deviceDetector = new DeviceDetector();
        const user = deviceDetector.parse(req.headers['user-agent']);

        inMemoryDatabase[UUID] = {
            id: UUID,
            user,
            favourites: [],
            tracking: {
                lastActive: Math.round(Date.now() / 1000),
                viewedProducts: {},
                viewedPages: {}
            },
            tests: {        // AB-tests
                buttonColor: Math.random() < 0.5 ? "A" : "B",
                initialPaymentOption
                // someOtherTest: await someApiEndPoint()
            },
            cart: {}     // cart

        }
        return inMemoryDatabase[UUID];
    }
}

const purchase = (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    // check stock levels (maybe one of the 10 items is unavailable...)

    const success = Math.random() < 0.5;       // eg. credit check
    if (success) {
        // remove one from stock supply
    } else {

    }
}

const updateCart = (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    // check stock levels
    const item = req.body;                   // {action: "add", sku: 123, price: 24}
    const id = `${item.sku}:${item.price} `;

    let product;
    if (cart[id]) {
        product = cart[id];
    } else {
        const copy = JSON.parse(JSON.stringify(getCatalogItemBySKU(item.sku)));
        product = {
            url: copy.url,
            name: copy.name,
            sku: item.sku,
            price: copy.prices[item.price],
            months: item.price,
            amount: 0,
            total: 0
        }
    }

    if (item.action == "add") {
        product.amount += 1;
    } else if (item.action == "minus") {
        product.amount -= 1;
    } else if (item.action == "remove") {
        product.amount = 0;
    }
    product.total = product.amount * product.price;
    if (product.amount <= 0) {
        delete cart[id]
    } else {
        cart[id] = product;
    }
    return cart;
}

// http://localhost:3000/ 
app.get('/', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const content = homePage(userConfig);
    res.send(genericHTMLContainer({ url: "/", userConfig, content, timeStamp }));
})

// http://localhost:3000/v2
app.get('/v2', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const content = homePageVersionTwo(userConfig);
    res.send(genericHTMLContainer({ url: "/v2", userConfig, content, timeStamp }));
})

// http://localhost:3000/some-campaign-page
app.get('/some-campaign-page', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    userConfig.tests.heroTest = userConfig.tests.heroTest || (Math.random() < 0.5 ? "A" : "B");
    const content = `< h1 > Hero test variant: ${tests.heroTest}</h1 > `;
    res.send(genericHTMLContainer({ url: "/some-campaign-page", userConfig, content, timeStamp }));

})

// http://localhost:3000/cart
app.get('/cart', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const { cart } = userConfig;
    const content = cartHTML(cart);
    res.send(genericHTMLContainer({ url: "/cart", userConfig, content, timeStamp }));
})

// http://localhost:3000/inline-cart
app.get('/inline-cart', (req, res) => {
    const { cart } = setCookieAndInitializeUserConfig(req, res);
    res.send(embedHTMLContainer(inlineCart(cart)));
})

// app.post('/cart', (req, res) => {
//     const cart = updateCart(req, res);
//     const content = cartHTML(cart);
//     res.send(genericHTMLContainer({ content }));
// })

app.post('/inline-cart', (req, res) => {
    const cart = updateCart(req, res);
    res.send(embedHTMLContainer(inlineCart(cart)));
})

app.post('/purchase', (req, res) => {
    const response = purchase(req, res);
    res.json(response);
})

// http://localhost:3000/product/10294
app.get('/product/:url', (req, res) => {
    const timeStamp = Date.now();
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const { cart } = userConfig
    const url = req?.params?.url;
    const content = productPage(url, cart);
    res.send(genericHTMLContainer({ url: `/ product / ${url} `, userConfig, content, timeStamp }));
})

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
            stats.pageLoads[url] = stats.pageLoads[url] || [];
            const loadTime = Date.now() - start;
            stats.pageLoads[url].push(loadTime);
        }
    }
    res.send("");
})



app.get('/debug', (req, res) => {
    res.json({ stats, inMemoryDatabase, catalog, stockLevels });
})

app.get('/ua-test', (req, res) => {
    const ua = req.headers['user-agent'];
    res.json({
        ua,
        "user-agent": userAgent(ua)
    }
    )
})

app.get('/manual-update-catalog', async (req, res) => {
    // TODO: password protect
    catalog = await fetchCatalog();
    res.json(catalog);
})

app.get('/manual-update-stock', async (req, res) => {
    // TODO: password protect
    stockLevels = await fetchStock();
    res.json(stockLevels);
})

app.get('/cat', (req, res) => {

    const loopDeep = (obj, arr, st) => {
        st = st || {};
        arr = arr || [];
        let found = false;

        for (const k in obj) {
            if (k === "variants") {

            } else if (Array.isArray(obj[k])) {
                // if array, go deeper
                found = true;
                for (const j of obj[k]) {
                    st[k] = j.value;
                    //st.sku = j.sku;
                    loopDeep(j, arr, st);
                }
            } else {
                st[k] = obj[k];
            }
        }
        if (!found) {
            delete st.value;
            arr.push({ ...st });
        }
        return arr;
    }

    const newCat = catalog.map(item => {
        return loopDeep(item);
    })
    //res.json(newCat.flat());
    res.json(catalog);
})

const buildDashboard = ({
    from = 0,
    to = 9e12
} = {}) => {

    let activeUsers = 0;
    const oses = {};
    const browsers = {};
    const brands = {};
    const types = {};
    const productViews = {};
    const pageViews = {};

    const isInRange = time => (time >= from && time <= to);

    const usersData = Object.values(inMemoryDatabase);
    usersData.forEach(obj => {
        const lastActive = obj.tracking.lastActive;
        const inRange = isInRange(lastActive);
        if (inRange) {
            activeUsers += 1;
            const os = obj.user?.os?.name;
            if (os) {
                oses[os] = oses[os] || [];
                oses[os].push(lastActive)
            }

            const browser = obj.user?.client?.name;
            if (browser) {
                browsers[browser] = browsers[browser] || [];
                browsers[browser].push(lastActive)
            }

            const brand = obj.user?.device?.brand;
            if (brand) {
                brands[brand] = brands[brand] || [];
                brands[brand].push(lastActive)
            }

            const type = obj.user?.device?.type;
            if (type) {
                types[type] = types[type] || [];
                types[type].push(lastActive)
            }
        }

        const productsViewed = Object.keys(obj.tracking.viewedProducts);
        productsViewed.forEach(product => {
            const time = obj.tracking.viewedProducts[product];
            const inRange = isInRange(time);
            if (inRange) {
                productViews[product] = productViews[product] || [];
                productViews[product].push(time);
            }
        })

        const pagesViewed = Object.keys(obj.tracking.viewedPages);
        pagesViewed.forEach(page => {
            const time = obj.tracking.viewedPages[page];
            const inRange = isInRange(time);
            if (inRange) {
                pageViews[page] = pageViews[page] || [];
                pageViews[page].push(time);
            }
        })

    })

    return {
        activeUsers,
        oses,
        browsers,
        brands,
        types,
        productViews,
        pageViews
    }
}

// app.get('/dashboard', (req, res) => {
//     const timeNow = Math.round(Date.now() / 1000);
//     const oneDayInSeconds = 60 * 60 * 24;
//     const minutesAgo = mins => timeNow - (mins * 60);
//     const dashboard = buildDashboard();
//     res.json(dashboard);
// })

app.get('/active-users', (req, res) => {
    const mins = req?.query?.minutes;
    const timeNow = Math.round(Date.now() / 1000);
    const minutesAgo = mins => timeNow - (mins * 60);
    const epochMinsAgo = minutesAgo(mins);

    const dashboard = buildDashboard({
        from: epochMinsAgo,
        to: timeNow
    });

    res.json(dashboard)

})

app.get('/my-data', (req, res) => {
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    res.json(userConfig);
})

const faveHTML = (url, action) => {
    return `
    <style>
        body{
            margin: 0;
        }
        button{
            display: block;
            background: none;
            border: 0;
            padding: 0;
            margin: 0;
        }
        svg{
            display: block;
            width: 30px;
            height: 30px;
            fill: #dd1010;
            stroke: #fff;
            stroke-width: 0.5;
        }
    </style>
    <form method="POST" action="/favourite" >
        <input type="hidden" name="url" value="${url}" >
        <button type="submit" name="action" value="${action}">
            <svg><use xlink:href="/images/icons.svg#heart-${action == "add" ? 'empty' : 'filled'}"></use></svg>
        </button>
    </form>`
}

app.get('/favourite', (req, res) => {
    const url = req?.query?.url;
    if (url) {
        const userConfig = setCookieAndInitializeUserConfig(req, res);
        const action = userConfig.favourites.includes(url) ? "remove" : "add";
        res.send(embedHTMLContainer(faveHTML(url, action)));
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
        res.send(embedHTMLContainer(faveHTML(url, action == "add" ? "remove" : "add")));
    } else {
        res.send("");
    }
})

app.get('/favourites', (req, res) => {
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    const faves = userConfig.favourites;
    res.send(faves.map(url => {
        return `<p>${url}</p>`;
    }).join(""))
})

app.get('/campaigns', (req, res) => {
    // Campaign prices for phones
    // with validation
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    res.send("hello")
})

app.get('/checkout', (req, res) => {
    const userConfig = setCookieAndInitializeUserConfig(req, res);
    res.send("hello")
})








const getUsersData = (req, res) => {
    let id = req?.cookies?.id;
    if (!id || !inMemoryDatabase[id]) {
        id = v4();
        const options = {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true
        }
        inMemoryDatabase[id] = {
            id,
            cart: {},
        }
        res.cookie('id', id, options);
    }
    return inMemoryDatabase[id];
}

const cart_html = usersCart => {
    const skus = Object.keys(usersCart);
    return skus.map(sku => {
        const { name, price, amount } = usersCart[sku];
        return `
    < div >
    <p>
        <b>sku: ${sku}</b>
        <br>name: ${name}
            <br>price: ${price} x ${amount} = ${price * amount}
            </p>
        </div>`
    }).join("");
}

app.get('/shopping-cart', (req, res) => {
    const { cart } = getUsersData(req, res);
    const content = cart_html(cart);
    const html = embedHTMLContainer(content);
    res.send(html);
})

app.get('/test-form', (req, res) => {
    const content = `
        <iframe src="/shopping-cart" name="here" ></iframe>
        <form method="post" action="/test-form" target="here">
            <label>sku: <input name="sku" type="text" placeholder="123"></label>
            <br><label>name: <input name="name" type="text" placeholder="iPhone 14"></label>
                <br><label>price: <input name="price" type="text" placeholder="999.99"></label>
                    <br><button type="submit" >send</button>
                    </form>
                    `;
    const html = embedHTMLContainer(content);
    res.send(html);
})

app.post('/test-form', (req, res) => {
    const { sku, name, price } = req.body;
    const { cart } = getUsersData(req, res);
    cart[sku] = cart[sku] || { name, price: Number(price), amount: 0 }
    cart[sku].amount = cart[sku].amount + 1;
    const content = cart_html(cart);
    const html = embedHTMLContainer(content);
    res.send(html);
})





app.get('/hello/:world', (req, res) => {
    const world = req?.params?.world;
    const html = embedHTMLContainer(`
        <h1>HELLO ${world}</h1>
        <img src="/images/xiaomi-redmi-note-11-lightblue.jpg">
    `);
    res.send(html);
})

app.get('/embed-test', (req, res) => {
    const content = `
        <style>
            .toggle-visibility{
                display: none;
            }
            input:checked~.toggle-visibility{
                display: block;
            }
        </style>
        <input type="checkbox">
        <embed width="100" height="100" class="toggle-visibility" src="/hello/embed">
        <object width="100" height="100" class="toggle-visibility" data="/hello/object"></object>
        <iframe width="100" height="100" class="toggle-visibility" loading="lazy" src="/hello/iframe"></iframe>
    `;

    const html = embedHTMLContainer(content);
    res.send(html);
})

app.get('/embed-target', (req, res) => {
    const content = `
        <style>
            .toggle-visibility{
                display: none;
            }
            div:target .toggle-visibility{
                display: block;
            }
        </style>
        <a href="#batman">batman!!</a>
        <a href="#!">not batman</a>
        <div id="batman">
            <embed class="toggle-visibility" src="/hello/embed">
        </div>
    `;

    const html = embedHTMLContainer(content);
    res.send(html);
})


app.get('/test', (req, res) => {
    const content = `
        <style>
            .gallery .images img{
                display: none;
            }
            .gallery .img-1:checked~.img-1 img,
            .gallery .img-2:checked~.img-2 img,
            .gallery .img-3:checked~.img-3 img,
            .gallery .img-4:checked~.img-4 img,
            .gallery .img-5:checked~.img-5 img,
            .gallery .img-6:checked~.img-6 img,
            .gallery .img-7:checked~.img-7 img,
            .gallery .img-8:checked~.img-8 img,
            .gallery .img-9:checked~.img-9 img,
            .gallery .img-10:checked~.img-10 img{
                display: block;
            }

            .gallery .images{
                transition: filter 1s;
                filter: blur(10px);
            }
            .gallery .img-1:checked~.img-1,
            .gallery .img-2:checked~.img-2,
            .gallery .img-3:checked~.img-3,
            .gallery .img-4:checked~.img-4,
            .gallery .img-5:checked~.img-5,
            .gallery .img-6:checked~.img-6,
            .gallery .img-7:checked~.img-7,
            .gallery .img-8:checked~.img-8,
            .gallery .img-9:checked~.img-9,
            .gallery .img-10:checked~.img-10{
                filter: blur(0);
            }            
        </style>

        <section class="gallery">
            <input class="vis-hid img-1" id="img-input-1" name="gallery" type="radio" checked >
            <input class="vis-hid img-2" id="img-input-2" name="gallery" type="radio" >
            <input class="vis-hid img-3" id="img-input-3" name="gallery" type="radio" >
            <input class="vis-hid img-4" id="img-input-4" name="gallery" type="radio" >
            <input class="vis-hid img-5" id="img-input-5" name="gallery" type="radio" >

            <div class="images img-1"><img loading="lazy" src="https://placehold.co/600x400?text=Image+1"></div>
            <div class="images img-2"><img loading="lazy" src="https://placehold.co/600x400?text=Image+2"></div>
            <div class="images img-3"><img loading="lazy" src="https://placehold.co/600x400?text=Image+3"></div>
            <div class="images img-4"><img loading="lazy" src="https://placehold.co/600x400?text=Image+4"></div>
            <div class="images img-5"><img loading="lazy" src="https://placehold.co/600x400?text=Image+5"></div>

            <div>
                <label for="img-input-1">image 1</label>
                <label for="img-input-2">image 2</label>
                <label for="img-input-3">image 3</label>
                <label for="img-input-4">image 4</label>
                <label for="img-input-5">image 5</label>
            </div>
        </section>
    `;
    const html = embedHTMLContainer(content);
    res.send(html);
})


const getStorage = obj => {
    const m = Object.keys(obj).filter(k => /storage_/.test(k));
    return m[0] ? obj[m[0]] : null;
}
const getColor = obj => {
    const m = Object.keys(obj).filter(k => /color_/.test(k));
    return m[0] ? obj[m[0]] : null;
}

app.post('/v2-cart', (req, res) => {
    const { product } = req?.body;
    const storage = getStorage(req?.body);
    const color = getColor(req?.body);
    const content = `
        <code>${product} ${storage} ${color}<code>
    `;
    const html = embedHTMLContainer(content);
    res.send(html);
})

app.post('/v2-modal', (req, res) => {
    const { product } = req?.body;
    const storage = getStorage(req?.body);
    const color = getColor(req?.body);
    const content = `
        <code>${product} ${storage} ${color}<code>

    `;
    const html = embedHTMLContainer(content);
    res.send(html);
})

app.get('/v2-modal', (req, res) => {
    const { product } = req?.query;
    const storage = getStorage(req?.query);
    const color = getColor(req?.query);
    const content = `
        <code>${product} ${storage} ${color}<code>

    `;
    const html = embedHTMLContainer(content);
    res.send(html);
})

app.get('/v2-test', (req, res) => {
    const content = `
        <style>
            .close-modal,
            .modal{
                display: none;   
            }

            #toggle-modal:checked~.close-modal,
            #toggle-modal:checked~.modal{
                display: block;
            }
            .open-modal{
                display:flex;
                background:none;
                margin:0;
                padding:0;
                border:0;
                margin-bottom: auto;
            }
            .label-modal{
                display: block;
            }
            .label-modal *{
                epointer-events: none;
            }
            .variable{
                display: none;
            }

            .vis-hid {
                clip: rect(0 0 0 0);
                clip-path: inset(50%);
                height: 1px;
                overflow: hidden;
                position: absolute;
                white-space: nowrap;
                width: 1px;
            }

            .st-0:checked~.open-modal .st-0{display:block}
            .st-1:checked~.open-modal .st-1{display:block}
            .st-2:checked~.open-modal .st-2{display:block}
            .st-3:checked~.open-modal .st-3{display:block}
            .st-4:checked~.open-modal .st-4{display:block}
            .st-5:checked~.open-modal .st-5{display:block}
            .col-0:checked~.open-modal .col-0{display:block}
            .col-1:checked~.open-modal .col-1{display:block}
            .col-2:checked~.open-modal .col-2{display:block}
            .col-3:checked~.open-modal .col-3{display:block}
            .col-4:checked~.open-modal .col-4{display:block}
            .col-5:checked~.open-modal .col-5{display:block}

            .st-0:checked~.open-modal .storage:not(.st-0){display:none;}
            .st-1:checked~.open-modal .storage:not(.st-1){display:none;}
            .st-2:checked~.open-modal .storage:not(.st-2){display:none;}
            .st-3:checked~.open-modal .storage:not(.st-3){display:none;}
            .st-4:checked~.open-modal .storage:not(.st-4){display:none;}
            .st-5:checked~.open-modal .storage:not(.st-5){display:none;}
            .col-0:checked~.open-modal .color:not(.col-0){display:none;}
            .col-1:checked~.open-modal .color:not(.col-1){display:none;}
            .col-2:checked~.open-modal .color:not(.col-2){display:none;}
            .col-3:checked~.open-modal .color:not(.col-3){display:none;}
            .col-4:checked~.open-modal .color:not(.col-4){display:none;}
            .col-5:checked~.open-modal .color:not(.col-5){display:none;}


        </style>
        <iframe class="cart" name="cart"></iframe>
        <input class="vis-hid" type="checkbox" id="toggle-modal">
        <iframe class="modal" name="modal"></iframe>


        <form class="form-modal" method="post" action="/v2-modal" target="modal">
            <input name="product" value="apple-iphone-11" type="hidden">
            <input id="storage_1-0" class="vis-hid st-0" name="storage_1" value="256" type="radio" checked>
            <input id="storage_1-1" class="vis-hid st-1" name="storage_1" value="128" type="radio">
            <input id="color_1-0" class="vis-hid col-0" name="color_1" value="black" type="radio" checked>
            <input id="color_1-1" class="vis-hid col-1" name="color_1" value="white" type="radio">
            <button class="open-modal">
                <label class="label-modal" for="toggle-modal">
                    <h1>Apple iPhone 11</h1>
                    <img class="color variable col-0" height="100" src="/images/apple-iphone-11-black.jpg" loading="lazy">
                    <img class="color variable col-1" height="100" src="/images/apple-iphone-11-white.jpg" loading="lazy">
                    <p class="storage variable st-0">699 €</p>
                    <p class="storage variable st-1">549 €</p>
                    <code class="storage color variable st-0 col-0" >10 in stock</code>
                    <code class="storage color variable st-0 col-1" >20 in stock</code>
                    <code class="storage color variable st-1 col-0" >30 in stock</code>
                    <code class="storage color variable st-1 col-1" >40 in stock</code>
                </label>
            </button>
            <label for="storage_1-0">256</label>
            <label for="storage_1-1">128</label>
            <label for="color_1-0">black</label>
            <label for="color_1-1">white</label>
            <button type="submit" formtarget="cart" formaction="/v2-cart">add to cart</button>
        </form>


        <form class="form-modal" method="post" action="/v2-modal" target="modal">
            <input name="product" value="nokia-xr20" type="hidden">
            <input id="storage_2-0" class="vis-hid st-0" name="storage_2" value="128" type="radio" checked>
            <input id="storage_2-1" class="vis-hid st-1" name="storage_2" value="64" type="radio">
            <input id="color_2-0" class="vis-hid col-0" name="color_2" value="blue" type="radio" checked>
            <input id="color_2-1" class="vis-hid col-1" name="color_2" value="graffiti" type="radio">
            <button class="open-modal">
                <label class="label-modal" for="toggle-modal">
                    <h1>Nokia XR20</h1>
                    <img class="color variable col-0" height="100" src="/images/nokia-xr20-blue.jpg" loading="lazy">
                    <img class="color variable col-1" height="100" src="/images/nokia-xr20-graffiti.jpg" loading="lazy">
                    <p class="storage variable st-0">499 €</p>
                    <p class="storage variable st-1">399 €</p>
                    <code class="storage color variable st-0 col-0" >100 in stock</code>
                    <code class="storage color variable st-0 col-1" >200 in stock</code>
                    <code class="storage color variable st-1 col-0" >300 in stock</code>
                    <code class="storage color variable st-1 col-1" >400 in stock</code>
                </label>
            </button>
            <label for="storage_2-0">128</label>
            <label for="storage_2-1">64</label>
            <label for="color_2-0">blue</label>
            <label for="color_2-1">graffiti</label>
            <button type="submit" formtarget="cart" formaction="/v2-cart">add to cart</button>
        </form>

        <label class="close-modal" for="toggle-modal">close</label>


    `;
    const html = embedHTMLContainer(content);
    res.send(html);
})
app.listen(3000, () => console.log("http://localhost:3000"));
