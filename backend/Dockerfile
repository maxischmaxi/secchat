# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath -ldflags="-s -w" \
    -o /out/secchat ./cmd/server

# Prepare /data with nonroot ownership (uid 65532) so the volume mount
# inherits the correct perms for SQLite write access.
RUN mkdir /data && chown 65532:65532 /data

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder --chown=65532:65532 /data /data
COPY --from=builder /out/secchat /secchat
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/secchat"]
