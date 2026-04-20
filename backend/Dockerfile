# syntax=docker/dockerfile:1.7
FROM golang:1.23-alpine AS builder
WORKDIR /src

COPY go.mod ./
COPY go.su[m] ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath -ldflags="-s -w" \
    -o /out/secchat ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/secchat /secchat
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/secchat"]
