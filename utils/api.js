import got from 'got';
import * as dotenv from "dotenv";
dotenv.config();

import { MEMORY } from './memory.js';

const RATE_LIMIT_MILLISECONDS = 1000 * 60 * 10; // 10 minutes

export const fetchCatalog = async () => {
    const time = Date.now();
    const timeDiff = time - (fetchCatalog.lastCalled || 0);
    if (timeDiff > RATE_LIMIT_MILLISECONDS) {
        fetchCatalog.lastCalled = time;
        try {
            const cat = await got.get("https://api.jsonbin.io/v3/b/63820bb62b3499323b0d38a6", {
                headers: {
                    "X-Access-Key": process.env.JSONBIN_APIKEY,
                    "X-Bin-Meta": false
                }
            }).json();
            return cat;
        } catch (error) {
            console.error("unable to fetch catalog from source", error);
            return MEMORY.catalog;
        }
    } else {
        return MEMORY.catalog;
    }
}

export const fetchProductDetails = async () => {
    const time = Date.now();
    const timeDiff = time - (fetchProductDetails.lastCalled || 0);
    if (timeDiff > RATE_LIMIT_MILLISECONDS) {
        fetchProductDetails.lastCalled = time;
        try {
            const details = await got.get("https://api.jsonbin.io/v3/b/63c5639615ab31599e3805da", {
                headers: {
                    "X-Access-Key": process.env.JSONBIN_APIKEY,
                    "X-Bin-Meta": false
                }
            }).json();
            return details;
        } catch (error) {
            console.error("unable to fetch product details from source", error);
            return MEMORY.productDetails;
        }
    } else {
        return MEMORY.productDetails;
    }
}

export const fetchStock = async () => {
    const time = Date.now();
    const timeDiff = time - (fetchStock.lastCalled || 0);
    if (timeDiff > RATE_LIMIT_MILLISECONDS) {
        fetchStock.lastCalled = time;
        try {
            const stock = await got.get("https://api.jsonbin.io/v3/b/63975dc9811f2b20b0868ee1", {
                headers: {
                    "X-Access-Key": process.env.JSONBIN_APIKEY,
                    "X-Bin-Meta": false
                }
            }).json();
            return stock;
        } catch (error) {
            console.error("unable to fetch stock from source", error);
            return MEMORY.stockLevels;
        }
    } else {
        return MEMORY.stockLevels;
    }
}

export const updateStock = async stock => {
    const time = Date.now();
    const timeDiff = time - (updateStock.lastCalled || 0);
    if (timeDiff > RATE_LIMIT_MILLISECONDS) {
        try {
            updateStock.lastCalled = time;
            const response = await got.put("https://api.jsonbin.io/v3/b/63975dc9811f2b20b0868ee1", {
                headers: {
                    "X-Access-Key": process.env.JSONBIN_APIKEY
                },
                json: stock
            }).json();
            return response.record;
        } catch (error) {
            console.error("unable to update stock", error);
            MEMORY.stockLevels = stock;
            return MEMORY.stockLevels;
        }
    } else {
        MEMORY.stockLevels = stock;
        return MEMORY.stockLevels;
    }
}