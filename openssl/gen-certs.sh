#!/bin/bash

WDIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
FLAGS_SHORT="hvca:"
FLAGS_LONG="help,verbose,skipCA,skipAPI:"
USAGE="
Usage:   $0 [--FLAGS] <arg1> <arg2> ...

Generate certificate and key pair for each <argn> hostname.

Options:
   --skipCA      Skip generating CA cert and key
   --skipAPI     Skip generating Home REST API cert and key"


### Args
TEMP=$(getopt -o "$FLAGS_SHORT" -l "$FLAGS_LONG" -- "$@")
if [ $? != 0 ]; then exit 1; fi
eval set -- "$TEMP"

while true; do
    case "$1" in
        -h | --help) echo "$USAGE"; exit 1;;
        -v | --verbose) VERBOSE=TRUE; shift;;
        -c | --skipCA) SKIP_CA=true; shift;;
        -a | --skipAPI) SKIP_API=true; shift;;
        --) shift; break;;
        *) break ;;
    esac
done
if [ $# -lt 1 ]; then echo "$USAGE"; exit 1; fi
if [ $VERBOSE ]; then set -x; fi

### Exec
# Generate CA Cert pair
if [ ! $SKIP_CA ]; then
    echo "Generating new certificate authority..."
    openssl genrsa -out $WDIR/ca.key 4096
    openssl req -x509 -new -sha256 -days 3650 -key $WDIR/ca.key -config $WDIR/conf/ca.conf -out $WDIR/ca-cert.pem
fi

if [ ! -f $WDIR/ca.key ]; then
    echo "Failed to get $WDIR/ca.key. Are you running --skipCA?"
else
    # Generate Home REST API cert pair
    echo "Generating new certificate for Home REST API..."
    if [ ! $SKIP_API ]; then
        openssl genrsa -out $WDIR/home-rest-api-cert.key 4096
        openssl req -new -sha256 -key $WDIR/home-rest-api-cert.key -config $WDIR/conf/rest-api-server.conf -out $WDIR/home-rest-api-cert.csr
        openssl x509 -req -sha256 -days 3560 -in $WDIR/home-rest-api-cert.csr -CA $WDIR/ca-cert.pem -CAkey $WDIR/ca.key -CAcreateserial -out $WDIR/home-rest-api-cert.pem
        rm $WDIR/home-rest-api-cert.csr
    fi

    # Generate Docker host machine cert pair
    echo "Generating new certificates for: $@..."
    for hostname in "$@"
    do
        openssl genrsa -out $WDIR/docker-host-cert.key 4096
        openssl req -new -sha256 -key $WDIR/docker-host-cert.key -config $WDIR/conf/docker-host.conf -out $WDIR/docker-host-cert.csr
        openssl x509 -req -sha256 -days 3560 -in $WDIR/docker-host-cert.csr -CA $WDIR/ca-cert.pem -CAkey $WDIR/ca.key -CAcreateserial -extfile <(printf "subjectAltName = DNS:$hostname,IP:127.0.0.1\nextendedKeyUsage = serverAuth") -out $WDIR/docker-host-cert.pem
        rm $WDIR/docker-host-cert.csr
    done
fi
