FROM alpine:3.20
RUN apk add --no-cache tor \
    && install -d -o tor -g tor -m 700 /var/lib/tor
USER tor
ENTRYPOINT ["tor", "-f", "/etc/tor/torrc"]
