FROM golang:1.23.1-alpine

WORKDIR /app

RUN apk add --no-cache gcc musl-dev

COPY go.mod ./
COPY go.sum ./

RUN go mod download

COPY . .

ENV CGO_ENABLED=1

RUN go build -o my-go-app .

EXPOSE 8000

CMD ["./my-go-app"]