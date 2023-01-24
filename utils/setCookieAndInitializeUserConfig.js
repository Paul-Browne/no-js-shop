import DeviceDetector from "device-detector-js";
import { v4 } from 'uuid';

import { MEMORY } from "./memory.js";

export const setCookieAndInitializeUserConfig = (req, res) => {
    const id = req?.cookies?.id;
    if (id && MEMORY.users[id]) {
        return MEMORY.users[id];
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

        MEMORY.users[UUID] = {
            id: UUID,
            user,
            favourites: [],
            tracking: {
                lastActive: Math.round(Date.now() / 1000),
                viewedProducts: {},
                viewedPages: {}
            },
            cart: {},       // cart
            tests: {        // AB-tests
                buttonColor: Math.random() < 0.5 ? "A" : "B",
                showAvailability: Math.random() < 0.5 ? true : false,
                initialPaymentOption
                // someOtherTest: await someApiEndPoint()
            }

        }
        return MEMORY.users[UUID];
    }
}