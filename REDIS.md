Your Upstash Redis database no-js-shop-redis is ready.
Apps in the personal org can connect to at redis://default:739863b6c7f245e7aba0070f70002813@fly-no-js-shop-redis.upstash.io
If you have redis-cli installed, use fly redis connect to connect to your database.

Redis database no-js-shop-redis is set on no-js-shop as the REDIS_URL environment variable

Your Node app is prepared for deployment.  Be sure to set your listen port
to 8080 using code similar to the following:

    const port = process.env.PORT || "8080";

If you need custom packages installed, or have problems with your deployment
build, you may need to edit the Dockerfile for app-specific changes. If you
need help, please post on https://community.fly.io.

Now: run 'fly deploy' to deploy your Node app.