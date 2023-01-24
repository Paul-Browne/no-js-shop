#!/bin/bash

#curl --silent --cookie-jar "cookie.txt" "http://localhost:3000" --output "/dev/null"
#COOKIE=$(curl -c- "http://localhost:3000" --silent --output /dev/null)
#echo $COOKIE

curl --silent --cookie-jar "cookie.txt" "http://localhost:3000" --output "/dev/null"
count=100
for i in $(seq $count); do
    # this has to read the cookie from the file 14 times, might affect performance
    curl -b cookie.txt --silent "http://localhost:3000" --output "/dev/null"
    #curl -b cookie.txt --silent -d "1=add" -X POST "http://localhost:3000/cart" --output "/dev/null"
done

#curl --cookie-jar "cookie.txt" "http://localhost:3000/cart"
#curl -b "cookie.txt" "http://localhost:3000/cart"