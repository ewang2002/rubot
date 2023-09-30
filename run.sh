set -e

if [[ "$1" == "test" ]]; then
    version="config.test.json"
    if [[ ! -f "$version" ]]; then
        echo "ERROR: TEST FILE NOT FOUND"
        exit 1
    fi 
else
    version="config.production.json"
    if [[ ! -f "$version" ]]; then
        echo "ERROR: PROD FILE NOT FOUND"
        exit 1
    fi 
fi

rm -rf out # removes old commands, puts in updated ones 
clear

npm run compile
clear

npm run start -- $version