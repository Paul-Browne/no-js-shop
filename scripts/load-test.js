// Runs out of memory, try bash script...

process.setMaxListeners(0);

import puppeteer from "puppeteer";

const delay = time => {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

Array(10).fill(0).forEach(async (_, j) => {
    await delay(1000 + (10000 * Math.random()))
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await delay(3000 + (3000 * Math.random()))
    await page.goto('http://localhost:3000');
    await delay(3000 + (3000 * Math.random()))
    let i = 50;
    while (i--) {
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
        await page.reload();
        await delay(1000 + (3000 * Math.random()));
        console.log(j, i);
    }
    await browser.close();
})

