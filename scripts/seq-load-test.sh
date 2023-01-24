#!/bin/bash

# 12 request in sequence
count=12
for i in $(seq $count); do
    # 12 request in parallel
    countertwo=12
    for j in $(seq $countertwo); do
        curl --silent "https://no-js-shop.fly.dev/" --output "/dev/null"
        #curl --silent "http://localhost:3000/track?action=pageview&url=/" --output "/dev/null"&
        #curl --silent "http://localhost:3000/inline-cart" --output "/dev/null"&     
    done
    #wait
    # curl --silent "http://localhost:3000/images/samsung-galaxy-a04s-black" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/samsung-galaxy-a04s-darkgreen" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/xiaomi-12t-pro-5g-lightblue" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/xiaomi-12t-pro-5g-graffiti" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/xiaomi-12t-5g-graffiti" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/xiaomi-12t-5g-lightblue" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/oppo-a16s-black" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/asus-rog-phone-6d-ultimate-16-512gb-5g-gray" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/nokia-g21-blue" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/emporia-smart-5-black" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/nokia-g21-purple" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/motorola-edge-30-fusion-5g-silver" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/motorola-razr-2022-5g-black" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/samsung-galaxy-a04s-white" --output "/dev/null"&
    # curl --silent "http://localhost:3000/images/motorola-edge-30-fusion-5g-graffiti" --output "/dev/null"&
    # wait
done