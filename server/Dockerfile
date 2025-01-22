# Используем официальный образ Go
FROM golang:1.23.1-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем необходимые зависимости для CGO
RUN apk add --no-cache gcc musl-dev

# Копируем файлы go.mod и go.sum (если есть)
COPY go.mod ./
COPY go.sum ./

# Скачиваем зависимости
RUN go mod download

# Копируем исходный код в контейнер
COPY . .

# Устанавливаем CGO_ENABLED=1 для сборки с CGO
ENV CGO_ENABLED=1

# Собираем приложение
RUN go build -o my-go-app .

# Указываем порт, который будет использовать приложение
EXPOSE 8000

# Запускаем приложение
CMD ["./my-go-app"]