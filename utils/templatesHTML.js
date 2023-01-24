export const outOfStockHTML = (itemsOutOfStock, cartProducts) => {
    const productsOutOfStock = Object.values(itemsOutOfStock);     // array of products
    const products = Object.values(cartProducts);     // array of products
    const outOfStockItems = productsOutOfStock.map(product => {
        return `
        <div>
            <p>only ${product.availableAmount} ${product.name} ${product.storage} ${product.color} available, your cart has ${product.amount}</p>
        </div>`
    }).join("");

    const cartItems = products.map(product => {
        return `
        <div>
            <p>${product.name} ${product.storage} ${product.color}, ${product.amount} x ${product.price}€ = ${product.total}€</p>
        </div>
        `
    }).join("");

    return outOfStockItems + cartItems;
}


export const orderHTML = cartProducts => {
    const products = Object.values(cartProducts);     // array of products
    let totalOfTotals = 0;
    const items = products.map(product => {
        totalOfTotals += product.total;
        return `
        <div>
            <p>${product.name} ${product.storage} ${product.color}, ${product.amount} x ${product.price}€ = ${product.total}€</p>
        </div>
        `
    }).join("");

    return `<h1>Thankyou for your purchase...</h1>` + items + `<div>${totalOfTotals}€</div>`
}

export const checkoutHTML = cartProducts => {
    return `
        <iframe class="cart" name="cart" src="/cart"></iframe>
        <form method="post" action="/purchase">
            <button class="btn" type="submit">BUY!!</button>
        </form>
    `;
}

export const cartHTML = cartProducts => {
    const products = Object.values(cartProducts);     // array of products
    let totalOfTotals = 0;
    const items = products.map(product => {
        totalOfTotals += product.total;
        return `
        <div>
            <p>${product.name} ${product.storage} ${product.color}, ${product.amount} x ${product.price}€ = ${product.total}€</p>
            <form method="post" action="/cart" >
                <button name="minus" value="${product.sku}" type="submit">-1</button>
                <button name="remove" value="${product.sku}" type="submit">remove</button>
                <button name="add" value="${product.sku}" type="submit">+1</button>
            </form>
        </div>
        `
    }).join("");

    return items + `<div>${totalOfTotals}€</div>`
};

export const favoriteHTML = (url, action) => {
    return `
    <form method="POST" action="/favourite" >
        <input type="hidden" name="url" value="${url}" >
        <button class="favorite" type="submit" name="action" value="${action}">
            <svg><use xlink:href="/images/icons.svg#heart-${action == "add" ? 'empty' : 'filled'}"></use></svg>
        </button>
    </form>`
}

export const gallery = (prod, index, ind) => {
    return prod.media?.length ? `
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
    </section>` : ``;
}

export const detailsHTML = details => {
    return `
    ${details?.usps ? `<ul>
        ${details.usps.map(el => `<li>${el}</li>`).join("")}
        ${details.usps.map(el => `<li>${el}</li>`).join("")}
        ${details.usps.map(el => `<li>${el}</li>`).join("")}
    </ul>` : ""}`
}