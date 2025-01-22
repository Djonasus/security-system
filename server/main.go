package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// FaceVector представляет данные для лица
type FaceVector struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserName   string    `json:"user_name"`
	FaceVector []float64 `gorm:"-" json:"face_vector"` // Пропускаем вектор при сохранении
	RawVector  string    `gorm:"type:text"`            // Сохраняем вектор как строку JSON
}

// Database instance
var db *gorm.DB

// Инициализация базы данных
func initDatabase() {
	var err error
	db, err = gorm.Open(sqlite.Open("face_auth.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}
	fmt.Println("Database connected!")

	// Миграция структуры
	err = db.AutoMigrate(&FaceVector{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	fmt.Println("Database migrated!")
}

// Функция для вычисления евклидова расстояния между двумя векторами
func calculateDistance(vec1, vec2 []float64) float64 {
	if len(vec1) != len(vec2) {
		return math.MaxFloat64 // Максимальное значение, если размеры не совпадают
	}
	var sum float64
	for i := range vec1 {
		sum += math.Pow(vec1[i]-vec2[i], 2)
	}
	return math.Sqrt(sum)
}

// Обработчик для проверки лица
func verifyFaceHandler(c *gin.Context) {
	var input struct {
		UserName   string    `json:"user_name"`
		FaceVector []float64 `json:"face_vector"`
	}

	// Декодируем JSON из запроса
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// Поиск пользователя в базе
	var user FaceVector
	if err := db.Where("user_name = ?", input.UserName).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Декодируем сохраненный вектор из строки
	var storedVector []float64
	if err := json.Unmarshal([]byte(user.RawVector), &storedVector); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode stored face vector"})
		return
	}

	// Сравнение векторов
	distance := calculateDistance(input.FaceVector, storedVector)
	if distance < 0.6 { // Пороговое значение (можно настроить)
		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Face authorized"})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "failure", "message": "Face not recognized"})
	}
}

// Обработчик для регистрации нового лица
func registerFaceHandler(c *gin.Context) {
	var input struct {
		UserName   string    `json:"user_name"`
		FaceVector []float32 `json:"face_vector"`
	}

	// Декодируем JSON из запроса
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// Кодируем вектор в JSON-строку
	rawVector, err := json.Marshal(input.FaceVector)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encode face vector"})
		return
	}

	// Сохраняем пользователя в базу данных
	user := FaceVector{
		UserName:  input.UserName,
		RawVector: string(rawVector),
	}
	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "User registered"})
}

func main() {
	// Инициализация базы данных
	initDatabase()

	// Создание маршрутов с помощью Gin
	r := gin.Default()

	r.Use(cors.Default())

	r.POST("/api/verify_face", verifyFaceHandler)
	r.POST("/api/register_face", registerFaceHandler)

	// Запуск сервера
	fmt.Println("Server is running on port 8000...")
	if err := r.Run(":8000"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
