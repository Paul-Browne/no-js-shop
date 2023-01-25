export const embedHTMLContainer = content => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="/css/styles.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:slnt,wght@-10,100;-10,200;-10,300;-10,400;-10,500;-10,600;-10,700;-10,800;-10,900;0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet">            
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;
}

export const genericHTMLContainer = ({
    content,
    timeStamp,
    userConfig,
    url,
    lang = "en",
    title = "no js shop",
    head = `<meta name="description" content="A Webshop that runs entirely without javascript!">`,
    bodyClasses = "",
    beforeClosingBodyTag = "",
    header = `<header><h1>no js shop!</h1></header>`,
    footer = `<footer><p>copyright 2022 etc.</p></footer>`,
} = {}) => {

    // A = control
    // B = variant
    const buttonColorVariant = userConfig?.tests?.buttonColor === "B";
    const isMobile = userConfig?.user?.device?.type === "smartphone";

    return `
        <!DOCTYPE html>
        <html lang="${lang}" >
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta content="website" property="og:type">

            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
            <link rel="manifest" href="/site.webmanifest">
            <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#ffdc00">
            <meta name="msapplication-TileColor" content="#ffdc00">
            <meta name="theme-color" content="#ffdc00">

            <link rel="stylesheet" href="https://static.shop.paulbrowne.dev/css/styles.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:slnt,wght@-10,100;-10,200;-10,300;-10,400;-10,500;-10,600;-10,700;-10,800;-10,900;0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet">
            ${head}
            <title>${title}</title>
            ${buttonColorVariant ? `
                <style>
                    .btn{
                        background-color: #fd800d;
                    }
                    .btn:hover{
                        background-color: #e87102;
                        border-color: #e87102;
                    }                    
                </style>
            `: ""}
        </head>
        <body class="${bodyClasses}" >
            ${header}
            ${content}
            ${footer}
            ${beforeClosingBodyTag}
            ${url ? `<img style="display:none;" src="/track?action=pageview&url=${url}" >` : ""}
            ${timeStamp && url ? `<img style="display:none;" src="/track?action=pageloaded&url=${url}&start=${timeStamp}" >` : ""}
        </body>
        </html>
    `;
}